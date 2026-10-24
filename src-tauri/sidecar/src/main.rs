//! `spool-ai` — Spool 里**唯一**会打开 socket 的那个进程（WORKPLAN-2026-08-20 §6.2，形态 C）。
//!
//! # 契约
//!
//! stdin 收一个 JSON 请求（读到 EOF 为止），stdout 吐**一行** JSON 信封，然后退出。
//! 没有别的输入通道，没有别的输出通道。
//!
//! ## ⚠️ key 只走 stdin，永远不走 argv
//!
//! `ps aux` 在 macOS 和 Windows 上都能看到**任何用户**进程的完整命令行。key 一旦出现在 argv
//! 里，同一台机器上的任何程序都能读到它。所以请求整体（包括 key）从 stdin 进来，而且这个进程
//! 从不把 key 打回 stdout 或 stderr —— 包括报错的时候。
//!
//! ## ⚠️ 失败必须可见（§6.2 设计约束 4）
//!
//! 这个进程**永远返回 exit code 0**，只要它成功地产出了一个信封。超时、余额不足、限流、key 不
//! 对、网断了，全部作为 `{"ok":false,"kind":…}` 返回。理由写在 §6.2 里：
//! 「唯一症状是沉默的失败」是这个项目最怕的一类 bug —— 如果失败走的是「非零退出码 + 空输出」，
//! 调用方能拿到的只有一个数字，界面上就只能写「失败了」，而用户需要知道的是**为什么**。
//! 非零退出码只留给一种情况：连信封都产不出来（stdin 不是合法 JSON）。
//!
//! ## ⚠️ 只接受 https
//!
//! `base_url` 是可配置的（DeepSeek / 硅基流动 / 任何 OpenAI 兼容端点都行），但明文 http 会把
//! key 原样发到线上。这里直接拒绝，不给「我知道我在干什么」的开关。

use serde::{Deserialize, Serialize};
use std::io::Read;
use std::time::{Duration, Instant};

/// 从 stdin 进来的请求。
#[derive(Deserialize)]
struct Request {
    /// 端点根地址，例如 `https://api.deepseek.com`。末尾有没有 `/` 都行。
    base_url: String,
    api_key: String,
    model: String,
    /// 系统提示。放在最前面，因为它是**每次都一样**的那一截 —— 见 `messages` 那里的注释。
    system: String,
    /// 这一次要压的东西。
    user: String,
    /// ⚠️ `None` = **不发这个字段**，让服务端用它自己的上限。
    ///
    /// 2026-08-20 实测踩到的坑：DeepSeek V4-Flash 是**会思考的模型**，思考产生的 token
    /// 和正文共用同一个额度。给了一个自以为够用的 `max_tokens`(按原文长度折算的),
    /// 结果它把额度全花在 `reasoning_content` 上,`content` 回来是**空字符串**——
    /// 界面上看起来像「接口不兼容」,实际上是我们自己把它掐断的。
    ///
    /// 猜一个更大的数同样不行:猜高了会被服务端以 400 顶回来。所以干脆不猜——**不发**。
    /// 花销由超时和账单兜底,而账单正是这一步要测的东西。
    ///
    /// ⚠️ `#[serde(default)]` 不能省。serde 对 `Option<T>` 的默认行为是**字段仍然必须出现**
    /// (只是允许它是 null),少了这一行,调用方不发这个字段就会被判成「请求不是合法 JSON」。
    #[serde(default)]
    max_output_tokens: Option<u32>,
    /// 思考力度。`None` = **什么都不发**，用服务端的默认。
    ///
    /// ⚠️ 2026-08-20 实测：约九成的账单和九成的等待时间花在「思考」上，不是花在压缩上。
    /// DeepSeek 的文档里确实有 `thinking` / `reasoning_effort` 这两个旋钮
    /// （`"thinking": {"type": "enabled"}, "reasoning_effort": "high"`），
    /// **但文档没有列出关掉它或者调低它的合法取值**。
    ///
    /// 所以这里不猜：把用户选的值原样发出去，让端点自己回答。不认的值会被 400 顶回来，
    /// 而 400 **不计费**，报错里又带着厂商原话（通常会点出合法取值）——
    /// 一个没有文档的问题，就这样变成一次不花钱的实验。
    #[serde(default)]
    reasoning_effort: Option<String>,
    /// 直接关掉思考。发的是 `"thinking": {"type": "disabled"}`。同上：不猜，让端点回答。
    #[serde(default)]
    thinking_disabled: bool,
    timeout_secs: u64,
    /// 这一次要它做什么。空 / `"chat"` = 压一段文字（这个进程原本唯一会做的事）；
    /// `"balance"` = 去问一句余额；`"models"` = 列出这个 key 能用的模型（P9U-3）。
    ///
    /// ⚠️ `#[serde(default)]` 同上 —— 少了它，老的调用方（不发这个字段）会被判成
    /// 「请求不是合法 JSON」，而那是一条非零退出、界面上只剩一个数字的路。
    #[serde(default)]
    kind: String,
    /// P9U-3（Ocean 10-24：「用户放入每家模型的 key 都能正常使用」）—— 这家说哪种话。
    /// 空 / `"openai"` = `/chat/completions` 那一套（DeepSeek、OpenAI、Gemini、Kimi、通义、智谱、
    /// OpenRouter 都有这种地址）；`"anthropic"` = Claude 自己的 Messages 接口（`/v1/messages`）。
    /// ⚠️ `#[serde(default)]` 同上：老的调用方不发这个字段，就是原来那条路。
    #[serde(default)]
    protocol: String,
    /// 温度。`None` = **不发**，用那家自己的默认。
    ///
    /// ⚠️ P9U-3 之前这里写死 0.2，那时只有 DeepSeek。别家不是都认：OpenAI 的推理模型和
    /// 新的 Claude 模型对温度直接回 400，Kimi 的新模型把它钉在 1。所以由调用方按厂商表决定发不发。
    #[serde(default)]
    temperature: Option<f64>,
    /// 列模型之前先拿这个 key 问一下这个路径（只对 `"models"` 有效）。空 = 不问。
    ///
    /// ⚠️ 2026-10-24 假 key 实测：OpenRouter 的 `/models` 是**公开的**，坏 key 照样回一整张表 ——
    /// 不先问一句，一个错的 key 在设置里会显示成「已连接」，要等第一次真跑才露馅。它的 `/key` 认 key。
    #[serde(default)]
    key_check_path: String,
    /// 跟进用哪家的联网搜索（只对 `"search"` 有效，P9U-4）：`openai` / `anthropic` / `gemini` / `kimi` / `qwen`。
    #[serde(default)]
    search: String,
}

/// 吐到 stdout 的信封。`ok` 是判别字段，两种形态的字段不重叠。
#[derive(Serialize)]
#[serde(untagged)]
enum Envelope {
    Ok {
        ok: bool,
        text: String,
        usage: Usage,
        model: String,
        /// 墙上时间，毫秒。界面要拿它跟「一次实时 web 运行」对照（§6.2）。
        ms: u128,
    },
    /// 余额。⚠️ 字段名和上面两种**一个都不重叠**，`untagged` 才分得开。
    ///
    /// ⚠️ 数字原样是**字符串**，⛔ 不在这里折算成 f64：厂商回的是
    /// `"25.50"` 这样的十进制串，而钱经过一次二进制浮点就可能变成 25.499999。
    /// 界面要的是把它印出来，不是拿它算术。
    Balance {
        ok: bool,
        /// 币种，例如 `CNY` / `USD`。
        currency: String,
        /// 还能用的总额（含赠送额度）。
        total: String,
        /// 厂商自己说的「这个账号现在还能不能调用」。
        usable: bool,
    },
    /// 这个 key 能用的模型（P9U-3）。⚠️ 字段名同样一个都不和别的形态重叠。
    Models {
        ok: bool,
        models: Vec<String>,
    },
    Err {
        ok: bool,
        /// 界面按这个分类说人话；`message` 是给「详情」用的原文。
        kind: &'static str,
        message: String,
        /// HTTP 状态码，没有就是 null。
        status: Option<u16>,
    },
}

/// ⚠️ `cached_input_tokens` 是这一整件事里最重要的一个数字。
///
/// §6.2 那个「一到三分钱」的账，整个建立在「pack 是确定性的，所以前缀天然命中缓存」上。
/// **那是一个估算，从来没有被实测过。** 这个字段就是去实测它的探针 —— §9 第 5 步要往案例账本
/// 里追的那一行「实测 vs 估算」，比的就是它。
///
/// DeepSeek 在 `usage` 里给 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`。别家
/// OpenAI 兼容端点大多没有这两个字段，那时候 `cached_input_tokens` 就是 `None`，界面必须说
/// 「这家没报缓存命中」，**而不是当成 0** —— 把「不知道」显示成「一次都没命中」会让实测直接说谎。
#[derive(Serialize, Default)]
struct Usage {
    input_tokens: u64,
    output_tokens: u64,
    cached_input_tokens: Option<u64>,
    /// 「思考」烧掉的 token，单独报。
    ///
    /// ⚠️ 这一栏会直接动摇 §6.2 那个成本估算：那张表按「30,000 输入 + **2,000 输出**」算的，
    /// 而一个会思考的模型可能先烧掉几千个思考 token,它们**按输出价计费**(最贵的那一档)。
    /// 混在 `output_tokens` 里就看不出这笔钱花在哪儿了。`None` = 这家没报。
    reasoning_tokens: Option<u64>,
}

fn main() {
    let mut raw = String::new();
    if std::io::stdin().read_to_string(&mut raw).is_err() {
        // 连 stdin 都读不下来 —— 这是调用方的 bug，不是一次失败的压缩。
        eprintln!("spool-ai: could not read the request from stdin");
        std::process::exit(2);
    }
    let req: Request = match serde_json::from_str(&raw) {
        Ok(r) => r,
        Err(e) => {
            // ⚠️ 只说解析在哪一步坏了，不回显 raw —— raw 里有 key。
            eprintln!("spool-ai: the request on stdin is not valid JSON ({e})");
            std::process::exit(2);
        }
    };
    // raw 里有 key，用完就地清掉，别让它在这个进程的内存里多待。
    drop(raw);

    let envelope = run(req);
    // 一行 JSON。调用方读整个 stdout，所以这里不需要分隔符，但保持单行让日志好看。
    match serde_json::to_string(&envelope) {
        Ok(s) => println!("{s}"),
        Err(e) => {
            eprintln!("spool-ai: could not serialise the envelope ({e})");
            std::process::exit(2);
        }
    }
}

/// 一行 JSON 到 stderr。⚠️ 这里永远不会出现请求内容,更不会出现 key。
fn progress(v: &serde_json::Value) {
    eprintln!("{v}");
}

fn err(kind: &'static str, message: impl Into<String>, status: Option<u16>) -> Envelope {
    Envelope::Err { ok: false, kind, message: message.into(), status }
}

fn run(req: Request) -> Envelope {
    let base = req.base_url.trim().trim_end_matches('/');
    if !base.starts_with("https://") {
        return err(
            "bad_config",
            "The endpoint must start with https:// — over plain http your API key would go out in the clear.",
            None,
        );
    }
    if req.api_key.trim().is_empty() {
        return err("bad_config", "No API key was given.", None);
    }
    if req.kind == "balance" {
        return balance(base, &req);
    }
    if req.kind == "models" {
        return list_models(base, &req);
    }
    if req.kind == "search" {
        return search(base, &req);
    }
    if req.protocol == "anthropic" {
        return run_anthropic(base, &req);
    }
    let url = format!("{base}/chat/completions");

    // ⚠️ system 在前、user 在后，而这个顺序是**钱**，不是风格问题。
    //
    // 前缀缓存按「从第一个 token 开始，逐字相同的那一截」计费。system 这一截每次调用都一模一样，
    // user 那一截每次都不同 —— 反过来放的话，第一个 token 就不同了，整个请求全部按未命中计价，
    // §6.2 那个 30 倍直接归零。
    //
    // ⚠️⚠️ 但即使这样排，前缀也**没有 §6.2 估的那么长**：pack 正文的第一段就是
    // 「Generated by Spool on <日期>. N blocks total.」（`src/lib/pack/templates.ts` 的
    // PACK_HEADER）—— 换一天、或者项目多了一块，这一行就变了，它后面那一大片静态表头也就跟着
    // 全部未命中。所以能稳定命中的只有 system 这一截。**这正是第 5 步要去实测的东西**，别在
    // 实测出来之前就照着估算的数字对外说话。
    let body = openai_body(&req);

    let timeout = Duration::from_secs(req.timeout_secs.clamp(10, 900));
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        // 这个进程只会连一个地址然后退出，连接池没有意义。
        .max_idle_connections(0)
        // ⚠️ 关掉「非 2xx 直接变成 Error」这个默认行为，这条不是风格问题。
        //
        // 默认那条路给回来的只有一个状态码，**厂商写在响应体里的那句解释会被丢掉**。
        // 而第一次配置时最可能撞上的错就是这一类：模型名写错了、账号还没实名、
        // 这个 key 没有开通这个模型 —— 它们全是 400，状态码本身什么也没说，
        // 有用的那句话全在响应体里。关掉之后每一条错误路径都能把厂商原话带回界面。
        .http_status_as_error(false)
        .build()
        .into();

    // 先带 `stream_options` 试一次。它是 OpenAI 兼容协议里「流式也要给我 usage」的写法,
    // 而 usage 正是第 5 步要测的东西——没有它,这一整趟就只剩一份稿子,没有账。
    // ⚠️ 但不是每家兼容端点都认这个字段,不认的会用 400 顶回来。所以撞到 400 就**退掉它重试一次**:
    //    宁可这一次拿不到 usage,也不要因为一个可选字段让整次压缩失败。400 不计费,重试不花钱。
    let first = call(&agent, &url, &req, &body, true, base);
    match first {
        Envelope::Err { status: Some(400), .. } => call(&agent, &url, &req, &body, false, base),
        other => other,
    }
}

/// `/chat/completions` 的请求体。拆出来好让测试钉住「温度只在要发的时候发」。
fn openai_body(req: &Request) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": req.model,
        "messages": [
            { "role": "system", "content": req.system },
            { "role": "user", "content": req.user },
        ],
        // 不流式：这个动作的产物是一整份压缩稿，要并排核对，逐字蹦出来没有意义，
        // 而流式会把错误处理变成两条路（HTTP 层的错 + 流里的错）。
        "stream": false,
    });
    // 压缩是搬运不是创作。低温让「一字不改地照抄骨架」这条规则更可能被守住 —— 只对认温度的那几家发。
    if let Some(t) = req.temperature {
        body["temperature"] = serde_json::json!(t);
    }
    if let Some(n) = req.max_output_tokens {
        body["max_tokens"] = serde_json::json!(n);
    }
    if let Some(effort) = req.reasoning_effort.as_deref().filter(|s| !s.is_empty()) {
        body["reasoning_effort"] = serde_json::json!(effort);
    }
    if req.thinking_disabled {
        body["thinking"] = serde_json::json!({ "type": "disabled" });
    }
    body
}

/// 问一句「还剩多少钱」。
///
/// ⚠️⚠️ **「余额」在 OpenAI 兼容协议里没有标准。** `/chat/completions` 是协议的一部分,
/// 每一家都认;余额不是——DeepSeek 有 `GET /user/balance`,别家各写各的,大多数干脆没有。
///
/// 所以这里**只问这一个地址**,问不到就老实说问不到:
///
///   * 404 / 405 → `kind: "unsupported"`。⛔ 这不是错误,是「这家不报」。界面必须把这两件
///     事分开说 —— 把「不知道」显示成一个数字(尤其是 0),会让用户按着一个假余额去安排事情。
///   * 401 / 403 → `auth`,和别处一样。key 不对就是 key 不对,和支不支持无关。
///
/// ⚠️ 不计费。查余额是一次 GET,厂商不按它收钱 —— 这也是为什么它敢在「跑完顺带刷一次」
/// 那个位置上被自动调用,而 `/chat/completions` 不敢。
fn balance(base: &str, req: &Request) -> Envelope {
    let url = format!("{base}/user/balance");
    let agent: ureq::Agent = ureq::Agent::config_builder()
        // ⚠️ 比正文那条短得多,而且**不用**外面传进来的 timeout:一次 GET 要是十秒还没回话,
        // 那不是「模型在想」,是这条路不通。让用户对着转圈等十分钟毫无意义。
        .timeout_global(Some(Duration::from_secs(20)))
        .max_idle_connections(0)
        .http_status_as_error(false)
        .build()
        .into();

    let resp = agent
        .get(&url)
        .header("Authorization", &format!("Bearer {}", req.api_key))
        .header("Accept", "application/json")
        .call();

    let mut resp = match resp {
        Ok(r) => r,
        Err(ureq::Error::Timeout(_)) => {
            return err("timeout", "The endpoint did not answer the balance query in time.", None)
        }
        // ⚠️ `e` 里不含 key（key 在 header 里，不在 URL 里）。
        Err(e) => return err("network", format!("Could not reach {base} — {e}"), None),
    };

    let status = resp.status().as_u16();
    let text = resp.body_mut().read_to_string().unwrap_or_default();
    if status == 404 || status == 405 {
        return err(
            "unsupported",
            format!("{base} does not answer /user/balance — this provider does not report a balance."),
            Some(status),
        );
    }
    if status == 401 || status == 403 {
        return err("auth", format!("The endpoint refused the key ({status})."), Some(status));
    }
    if status >= 400 {
        return err("http", clip_body(&text), Some(status));
    }

    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
        return err("bad_response", clip_body(&text), Some(status));
    };
    // DeepSeek 的形状：{"is_available":true,"balance_infos":[{"currency":"CNY",
    // "total_balance":"25.50",…}]}。⚠️ 一个账号可以有好几种币，取第一条 —— 界面上要的是
    // 「还能不能用」和「大概还剩多少」，⛔ 不是一份财务报表。
    let first = v.get("balance_infos").and_then(|a| a.as_array()).and_then(|a| a.first());
    let Some(info) = first else {
        // 200 但不是这个形状 —— 这家的余额长别的样子，和「不报」是同一种结局。
        return err(
            "unsupported",
            format!("{base} answered, but not in a shape Spool can read: {}", clip_body(&text)),
            Some(status),
        );
    };
    let pick = |k: &str| info.get(k).and_then(|x| x.as_str()).unwrap_or("").to_string();
    Envelope::Balance {
        ok: true,
        currency: pick("currency"),
        total: pick("total_balance"),
        usable: v.get("is_available").and_then(|b| b.as_bool()).unwrap_or(true),
    }
}

/// ⚠️ 响应体可能是一整页 HTML（403 那次就是）。截短,而且这里**永远不会**出现 key。
fn clip_body(s: &str) -> String {
    let s = s.trim();
    if s.chars().count() <= 300 {
        return s.to_string();
    }
    format!("{}…", s.chars().take(300).collect::<String>())
}

/// 一次 GET 用的 agent（余额、模型列表）。⚠️ 二十秒，**不**用外面传进来的 timeout ——
/// 一次 GET 要是二十秒还没回话，那不是「模型在想」，是这条路不通。
fn quick_agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(20)))
        .max_idle_connections(0)
        .http_status_as_error(false)
        .build()
        .into()
}

/// 列出这个 key 能用的模型（P9U-3，Ocean 10-24 第 188 条：「模型从那家接口拉列表让人挑」）。
///
/// OpenAI 那一套是 `GET {base}/models`（Bearer）；Claude 是 `GET {base}/v1/models`（`x-api-key`）。
/// ⚠️ 不计费，和查余额一样是一次 GET —— 粘进 key 那一刻就敢去问。
///
///   * 401 / 403 → `auth`。⭐ 前端拿它分辨「这个 key 不是这个地区的」（Kimi、通义、智谱国内外是两个地址，
///     key 只认自己那一个），所以它必须和别的失败分开。
///   * 404 / 405 → `unsupported`：这家不给列表，界面退回让人自己填模型名。⛔ 不是错误。
fn list_models(base: &str, req: &Request) -> Envelope {
    let anthropic = req.protocol == "anthropic";
    if !req.key_check_path.is_empty() {
        let url = format!("{base}{}", req.key_check_path);
        let resp = quick_agent()
            .get(&url)
            .header("Accept", "application/json")
            .header("Authorization", &format!("Bearer {}", req.api_key))
            .call();
        match resp {
            Ok(mut r) => {
                let status = r.status().as_u16();
                if status == 401 || status == 403 {
                    let text = r.body_mut().read_to_string().unwrap_or_default();
                    return models_from_body(status, &text, base);
                }
            }
            Err(ureq::Error::Timeout(_)) => {
                return err("timeout", "The endpoint did not answer the key check in time.", None)
            }
            Err(e) => return err("network", format!("Could not reach {base} — {e}"), None),
        }
    }
    let url = if anthropic { format!("{base}/v1/models?limit=1000") } else { format!("{base}/models") };
    let mut call = quick_agent().get(&url).header("Accept", "application/json");
    call = if anthropic {
        call.header("x-api-key", &req.api_key).header("anthropic-version", ANTHROPIC_VERSION)
    } else {
        call.header("Authorization", &format!("Bearer {}", req.api_key))
    };
    let mut resp = match call.call() {
        Ok(r) => r,
        Err(ureq::Error::Timeout(_)) => {
            return err("timeout", "The endpoint did not answer the model list in time.", None)
        }
        // ⚠️ `e` 里不含 key（key 在 header 里，不在 URL 里）。
        Err(e) => return err("network", format!("Could not reach {base} — {e}"), None),
    };
    let status = resp.status().as_u16();
    let text = resp.body_mut().read_to_string().unwrap_or_default();
    models_from_body(status, &text, base)
}

/// 响应体 → 模型列表。单独一个函数，好让测试钉住每家的形状。
fn models_from_body(status: u16, text: &str, base: &str) -> Envelope {
    if status == 404 || status == 405 {
        return err(
            "unsupported",
            format!("{base} does not list its models — type the model name instead."),
            Some(status),
        );
    }
    let parsed = serde_json::from_str::<serde_json::Value>(text).unwrap_or(serde_json::Value::Null);
    if status >= 400 {
        let msg = vendor_error(&parsed).unwrap_or_else(|| format!("{} — {}", http_message(status), clip(text)));
        return err(classify_with(status, &msg), msg, Some(status));
    }
    let Some(items) = parsed.get("data").and_then(|d| d.as_array()) else {
        return err("bad_response", format!("The model list came back in a shape Spool can't read: {}", clip(text)), Some(status));
    };
    let mut models: Vec<String> = Vec::new();
    for it in items {
        // Gemini 的 OpenAI 兼容地址回的是 `models/gemini-…`，而发请求时用的是不带前缀的名字。
        let Some(id) = it.get("id").and_then(|v| v.as_str()) else { continue };
        let id = id.trim_start_matches("models/").to_string();
        if !id.is_empty() && !models.contains(&id) {
            models.push(id);
        }
    }
    Envelope::Models { ok: true, models }
}

// ---------------------------------------------------------------------------------------
// Claude 自己的 Messages 接口（P9U-3）
// ---------------------------------------------------------------------------------------
//
// ⚠️ 为什么不走 Claude 的 OpenAI 兼容地址：那条只是过渡用的，不支持它自己的联网搜索（P9U-4 要用），
// 也不报缓存命中。Messages 接口是一次 POST + 一条 SSE 流，和上面那条一样短。

const ANTHROPIC_VERSION: &str = "2023-06-01";
/// Messages 接口**必须**给 `max_tokens`（和上面「不发」那条相反）。当前几代模型的输出上限都是 128K，
/// 流式所以不怕 HTTP 超时；给 64K 是留出思考那一截之后仍然够一整份压缩稿。
const ANTHROPIC_MAX_TOKENS: u32 = 64_000;
/// 安全分类器拒答时，让服务端在同一次调用里换一个模型接着答（`fallbacks: "default"`）。
/// ⚠️ 只有这几个模型收这个参数；Haiku 5.5 没有备用模型，带上它会 400。
const ANTHROPIC_FALLBACK_BETA: &str = "server-side-fallback-2026-07-01";
const ANTHROPIC_FALLBACK_MODELS: &[&str] =
    &["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"];

fn anthropic_takes_fallback(model: &str) -> bool {
    ANTHROPIC_FALLBACK_MODELS.contains(&model)
}

/// 发出去的请求体。拆出来是为了测试能钉住：**不发温度**（新模型对它回 400）、
/// 「思考力度」走 `output_config.effort`、system 那一截打缓存标记。
fn anthropic_body(req: &Request) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": req.model,
        "max_tokens": req.max_output_tokens.unwrap_or(ANTHROPIC_MAX_TOKENS),
        // system 每次都一样，打上缓存标记；pack 在 user 那一截。顺序的理由和上面 OpenAI 那条一样。
        "system": [{ "type": "text", "text": req.system, "cache_control": { "type": "ephemeral" } }],
        "messages": [{ "role": "user", "content": req.user }],
        "stream": true,
    });
    if let Some(effort) = req.reasoning_effort.as_deref().filter(|s| !s.is_empty()) {
        body["output_config"] = serde_json::json!({ "effort": effort });
    }
    if anthropic_takes_fallback(&req.model) {
        body["fallbacks"] = serde_json::json!("default");
    }
    body
}

fn run_anthropic(base: &str, req: &Request) -> Envelope {
    let url = format!("{base}/v1/messages");
    let body = anthropic_body(req);
    let timeout = Duration::from_secs(req.timeout_secs.clamp(10, 900));
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        .max_idle_connections(0)
        // 理由同上：厂商写在响应体里的那句解释要带回界面。
        .http_status_as_error(false)
        .build()
        .into();

    progress(&serde_json::json!({ "stage": "sending" }));
    let started = Instant::now();
    let mut call = agent
        .post(&url)
        .header("x-api-key", &req.api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("Content-Type", "application/json");
    if anthropic_takes_fallback(&req.model) {
        call = call.header("anthropic-beta", ANTHROPIC_FALLBACK_BETA);
    }
    let mut resp = match call.send_json(&body) {
        Ok(r) => r,
        Err(ureq::Error::Timeout(_)) => {
            return err("timeout", "The endpoint did not even send a reply header in time.", None)
        }
        Err(e) => return err("network", format!("Could not reach {base} — {e}"), None),
    };
    let status = resp.status().as_u16();
    if status >= 400 {
        let text = resp.body_mut().read_to_string().unwrap_or_default();
        let parsed = serde_json::from_str::<serde_json::Value>(&text).unwrap_or(serde_json::Value::Null);
        return envelope_from_body(&parsed, status, &text, &req.model, started.elapsed().as_millis());
    }

    let mut stream = AnthropicStream::default();
    let mut read_error: Option<String> = None;
    let mut last_report = Instant::now();
    {
        let reader = std::io::BufReader::new(resp.body_mut().as_reader());
        for line in std::io::BufRead::lines(reader) {
            let line = match line {
                Ok(l) => l,
                Err(e) => {
                    read_error = Some(e.to_string());
                    break;
                }
            };
            let Some(payload) = line.strip_prefix("data:") else { continue };
            let Ok(v) = serde_json::from_str::<serde_json::Value>(payload.trim()) else { continue };
            if !stream.feed(&v) {
                break;
            }
            if last_report.elapsed() >= Duration::from_millis(400) {
                progress(&serde_json::json!({
                    "stage": if stream.content.is_empty() { "thinking" } else { "writing" },
                    "thinking": stream.thinking.chars().count(),
                    "written": stream.content.chars().count(),
                }));
                last_report = Instant::now();
            }
        }
    }
    stream.finish(read_error, status, &req.model, started.elapsed().as_millis())
}

/// 一条 Messages 流读到哪儿了。⚠️ 纯数据，好让测试拿一串事件喂进去看结局。
#[derive(Default)]
struct AnthropicStream {
    content: String,
    thinking: String,
    model: Option<String>,
    input: u64,
    cache_read: Option<u64>,
    cache_write: u64,
    output: u64,
    stop: Option<String>,
    /// 流里来的 `error` 事件（例如 `overloaded_error`）：(type, message)。
    error: Option<(String, String)>,
}

impl AnthropicStream {
    /// 吃一个事件。返回 false = 流结束了（`message_stop` 或 `error`）。
    ///
    /// ⚠️ 服务端换模型接着答时（`fallbacks`），流里会多一个 `fallback` 内容块，前面那半截正文**留着**，
    /// 新模型从那里接着写 —— 所以正文照样一直往后拼，那个块本身不用管。
    fn feed(&mut self, v: &serde_json::Value) -> bool {
        match v.get("type").and_then(|t| t.as_str()).unwrap_or("") {
            "message_start" => {
                let m = v.get("message");
                if let Some(id) = m.and_then(|m| m.get("model")).and_then(|x| x.as_str()) {
                    self.model = Some(id.to_string());
                }
                if let Some(u) = m.and_then(|m| m.get("usage")) {
                    self.read_usage(u);
                }
            }
            "content_block_delta" => {
                let d = v.get("delta");
                match d.and_then(|d| d.get("type")).and_then(|t| t.as_str()) {
                    Some("text_delta") => {
                        if let Some(t) = d.and_then(|d| d.get("text")).and_then(|x| x.as_str()) {
                            self.content.push_str(t);
                        }
                    }
                    Some("thinking_delta") => {
                        if let Some(t) = d.and_then(|d| d.get("thinking")).and_then(|x| x.as_str()) {
                            self.thinking.push_str(t);
                        }
                    }
                    _ => {}
                }
            }
            "message_delta" => {
                if let Some(s) = v.pointer("/delta/stop_reason").and_then(|x| x.as_str()) {
                    self.stop = Some(s.to_string());
                }
                if let Some(u) = v.get("usage") {
                    self.read_usage(u);
                }
            }
            "message_stop" => return false,
            "error" => {
                let kind = v.pointer("/error/type").and_then(|x| x.as_str()).unwrap_or("error");
                let msg = v.pointer("/error/message").and_then(|x| x.as_str()).unwrap_or("");
                self.error = Some((kind.to_string(), msg.to_string()));
                return false;
            }
            _ => {}
        }
        true
    }

    /// `message_start` 和 `message_delta` 都可能带 usage；后来的那个是累计数，所以取大的。
    fn read_usage(&mut self, u: &serde_json::Value) {
        let n = |k: &str| u.get(k).and_then(|x| x.as_u64());
        if let Some(x) = n("input_tokens") {
            self.input = self.input.max(x);
        }
        if let Some(x) = n("cache_read_input_tokens") {
            self.cache_read = Some(self.cache_read.unwrap_or(0).max(x));
        }
        if let Some(x) = n("cache_creation_input_tokens") {
            self.cache_write = self.cache_write.max(x);
        }
        if let Some(x) = n("output_tokens") {
            self.output = self.output.max(x);
        }
    }

    fn finish(self, read_error: Option<String>, status: u16, asked_model: &str, ms: u128) -> Envelope {
        let (thought_n, written_n) = (self.thinking.chars().count(), self.content.chars().count());
        if let Some((kind, msg)) = self.error {
            let k = if kind == "overloaded_error" || kind == "api_error" { "upstream" } else { "http" };
            return err(k, format!("{kind}: {msg}"), Some(status));
        }
        if let Some(e) = read_error {
            if self.content.trim().is_empty() {
                return err(
                    classify_read_error(&e),
                    format!(
                        "The connection ended after {}s with no briefing written. By then the model had produced {thought_n} characters of thinking and {written_n} of briefing. ({e})",
                        ms / 1000
                    ),
                    Some(status),
                );
            }
            return err(
                "cut_off",
                format!(
                    "The briefing was cut off partway: {written_n} characters had arrived after {}s (plus {thought_n} characters of thinking). ({e})",
                    ms / 1000
                ),
                Some(status),
            );
        }
        // ⛔ 拒答是 HTTP 200 + `stop_reason: "refusal"`，正文可能是空的，也可能是半截 —— 半截也不能交出去。
        if self.stop.as_deref() == Some("refusal") {
            return err(
                "refused",
                format!("The model declined this request (stop_reason: refusal) after {written_n} characters."),
                Some(status),
            );
        }
        if self.content.trim().is_empty() {
            if thought_n > 0 {
                return err(
                    "thought_only",
                    format!("The model spent the whole reply thinking ({thought_n} characters) and wrote no briefing."),
                    Some(status),
                );
            }
            return err("bad_response", "The stream ended without any content.", Some(status));
        }
        if self.stop.as_deref() == Some("max_tokens") {
            return err(
                "truncated",
                format!(
                    "The briefing was cut off by the output-token limit: {written_n} characters had arrived after {}s.",
                    ms / 1000
                ),
                Some(status),
            );
        }
        // ⚠️ Messages 接口的 `input_tokens` **不含**缓存读写的那两截；这里加回去，
        // 好和 OpenAI 那一套（`prompt_tokens` 含缓存命中）是同一个口径。
        let cached = self.cache_read;
        Envelope::Ok {
            ok: true,
            text: self.content,
            usage: Usage {
                input_tokens: self.input + cached.unwrap_or(0) + self.cache_write,
                output_tokens: self.output,
                cached_input_tokens: cached,
                // 这家不单独报思考用了多少 —— 是「不知道」，不是 0。
                reasoning_tokens: None,
            },
            model: self.model.unwrap_or_else(|| asked_model.to_string()),
            ms,
        }
    }
}

// ---------------------------------------------------------------------------------------
// 跟进：用那家自带的联网搜索问一次（P9U-4，Ocean 10-24 第 186 条）
// ---------------------------------------------------------------------------------------
//
// ⚠️ 五家五种接法，没有一种是 `/chat/completions` 那条标准路：
//   * OpenAI    —— Responses 接口（`/responses`）+ `web_search` 工具；
//   * Claude    —— Messages 接口 + `web_search` 服务端工具（搜到一半会 `pause_turn`，要接着发）；
//   * Gemini    —— 它自己的 `generateContent` + `google_search`（OpenAI 兼容那条地址不给联网）；
//   * Kimi      —— `/chat/completions` + 内置函数 `$web_search`（它回 tool_calls，要原样递回去再问一次）；
//   * 通义      —— `/chat/completions` + `enable_search: true`。
// 回答都很短（一个 JSON 对象），所以这里**不流式**：一次 POST、一个响应体，出错时厂商原话照旧带回。
// 回答是什么格式由提示词定（mcp.rs `follow_up_api_system`），这里只负责把那段字拿回来。

/// 搜索那一趟的输出上限。回答是一个 JSON 对象，但会思考的模型先想再写，留足。
const SEARCH_MAX_TOKENS: u32 = 16_000;
/// Claude 的 `pause_turn` / Kimi 的 tool_calls 最多接几轮。到了还没完就当失败报出来。
const SEARCH_MAX_ROUNDS: usize = 6;
/// Claude 一次跟进最多搜几次（按次计费，$10 / 千次）。
const ANTHROPIC_SEARCH_MAX_USES: u32 = 8;
/// 认带动态筛选那一版（`web_search_20260209`）的 Claude 模型；别的用基础版。
const ANTHROPIC_DYNAMIC_SEARCH_MODELS: &[&str] = &[
    "claude-opus-5-5",
    "claude-opus-5",
    "claude-opus-4-8",
    "claude-opus-4-7",
    "claude-opus-4-6",
    "claude-sonnet-5-5",
    "claude-sonnet-5",
    "claude-sonnet-4-6",
];

fn anthropic_search_tool(model: &str) -> &'static str {
    if ANTHROPIC_DYNAMIC_SEARCH_MODELS.contains(&model) {
        "web_search_20260209"
    } else {
        "web_search_20250305"
    }
}

fn search(base: &str, req: &Request) -> Envelope {
    let timeout = Duration::from_secs(req.timeout_secs.clamp(10, 900));
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        .max_idle_connections(0)
        .http_status_as_error(false)
        .build()
        .into();
    progress(&serde_json::json!({ "stage": "sending" }));
    let started = Instant::now();
    let out = match req.search.as_str() {
        "openai" => search_openai(&agent, base, req),
        "anthropic" => search_anthropic(&agent, base, req),
        "gemini" => search_gemini(&agent, base, req),
        "kimi" => search_kimi(&agent, base, req),
        "qwen" => search_qwen(&agent, base, req),
        other => Err(err(
            "unsupported",
            format!("This provider has no web search Spool can use ({other:?})."),
            None,
        )),
    };
    match out {
        Ok((text, usage, model)) => Envelope::Ok { ok: true, text, usage, model, ms: started.elapsed().as_millis() },
        Err(e) => e,
    }
}

type SearchOut = Result<(String, Usage, String), Envelope>;

/// 发一次 JSON POST，拿回 (状态码, 解析后的体, 原文)。连不上 / 超时直接是失败信封。
fn post_json(
    agent: &ureq::Agent,
    url: &str,
    headers: &[(&str, String)],
    body: &serde_json::Value,
    base: &str,
) -> Result<(u16, serde_json::Value, String), Envelope> {
    let mut call = agent.post(url).header("Content-Type", "application/json");
    for (k, v) in headers {
        call = call.header(*k, v);
    }
    let mut resp = match call.send_json(body) {
        Ok(r) => r,
        Err(ureq::Error::Timeout(_)) => {
            return Err(err("timeout", "The search did not come back in time.", None))
        }
        Err(e) => return Err(err("network", format!("Could not reach {base} — {e}"), None)),
    };
    let status = resp.status().as_u16();
    let text = resp.body_mut().read_to_string().unwrap_or_default();
    let parsed = serde_json::from_str::<serde_json::Value>(&text).unwrap_or(serde_json::Value::Null);
    Ok((status, parsed, text))
}

/// 4xx / 5xx → 带厂商原话的失败信封（Gemini 坏 key 的 400 也认成 auth，见 `classify_with`）。
fn http_failure(status: u16, parsed: &serde_json::Value, raw: &str) -> Envelope {
    let msg = vendor_error(parsed).unwrap_or_else(|| format!("{} — {}", http_message(status), clip(raw)));
    err(classify_with(status, &msg), msg, Some(status))
}

fn bearer(req: &Request) -> Vec<(&'static str, String)> {
    vec![("Authorization", format!("Bearer {}", req.api_key))]
}

fn effort(req: &Request) -> Option<&str> {
    req.reasoning_effort.as_deref().filter(|s| !s.is_empty())
}

fn openai_search_body(req: &Request) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": req.model,
        "instructions": req.system,
        "input": req.user,
        "tools": [{ "type": "web_search" }],
    });
    if let Some(e) = effort(req) {
        body["reasoning"] = serde_json::json!({ "effort": e });
    }
    body
}

/// Responses 接口的回答 → 正文。正文在 `output[]` 里 type 为 message 的那几项的 `output_text` 里。
fn openai_search_text(v: &serde_json::Value) -> Result<(String, Usage, String), Envelope> {
    if v.get("status").and_then(|s| s.as_str()) == Some("incomplete") {
        let why = v.pointer("/incomplete_details/reason").and_then(|s| s.as_str()).unwrap_or("not reported");
        return Err(err("truncated", format!("The search answer was cut off ({why})."), None));
    }
    let mut text = String::new();
    for item in v.get("output").and_then(|o| o.as_array()).into_iter().flatten() {
        if item.get("type").and_then(|t| t.as_str()) != Some("message") {
            continue;
        }
        for c in item.get("content").and_then(|c| c.as_array()).into_iter().flatten() {
            if c.get("type").and_then(|t| t.as_str()) == Some("output_text") {
                text.push_str(c.get("text").and_then(|t| t.as_str()).unwrap_or(""));
            }
        }
    }
    if text.trim().is_empty() {
        return Err(err("bad_response", "The search came back with no answer text.", None));
    }
    let u = v.get("usage");
    let n = |p: &str| u.and_then(|u| u.pointer(p)).and_then(|x| x.as_u64());
    let usage = Usage {
        input_tokens: n("/input_tokens").unwrap_or(0),
        output_tokens: n("/output_tokens").unwrap_or(0),
        cached_input_tokens: n("/input_tokens_details/cached_tokens"),
        reasoning_tokens: n("/output_tokens_details/reasoning_tokens"),
    };
    let model = v.get("model").and_then(|m| m.as_str()).unwrap_or("").to_string();
    Ok((text, usage, model))
}

fn search_openai(agent: &ureq::Agent, base: &str, req: &Request) -> SearchOut {
    let (status, v, raw) = post_json(agent, &format!("{base}/responses"), &bearer(req), &openai_search_body(req), base)?;
    if status >= 400 {
        return Err(http_failure(status, &v, &raw));
    }
    let (text, usage, model) = openai_search_text(&v)?;
    Ok((text, usage, if model.is_empty() { req.model.clone() } else { model }))
}

fn anthropic_search_body(req: &Request, messages: &serde_json::Value) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": req.model,
        "max_tokens": SEARCH_MAX_TOKENS,
        "system": [{ "type": "text", "text": req.system, "cache_control": { "type": "ephemeral" } }],
        "messages": messages,
        "tools": [{ "type": anthropic_search_tool(&req.model), "name": "web_search", "max_uses": ANTHROPIC_SEARCH_MAX_USES }],
    });
    if let Some(e) = effort(req) {
        body["output_config"] = serde_json::json!({ "effort": e });
    }
    if anthropic_takes_fallback(&req.model) {
        body["fallbacks"] = serde_json::json!("default");
    }
    body
}

fn search_anthropic(agent: &ureq::Agent, base: &str, req: &Request) -> SearchOut {
    let mut headers = vec![
        ("x-api-key", req.api_key.clone()),
        ("anthropic-version", ANTHROPIC_VERSION.to_string()),
    ];
    if anthropic_takes_fallback(&req.model) {
        headers.push(("anthropic-beta", ANTHROPIC_FALLBACK_BETA.to_string()));
    }
    let mut messages = serde_json::json!([{ "role": "user", "content": req.user }]);
    let (mut text, mut usage, mut model) = (String::new(), Usage::default(), req.model.clone());
    for _ in 0..SEARCH_MAX_ROUNDS {
        let (status, v, raw) =
            post_json(agent, &format!("{base}/v1/messages"), &headers, &anthropic_search_body(req, &messages), base)?;
        if status >= 400 {
            return Err(http_failure(status, &v, &raw));
        }
        let u = v.get("usage");
        let n = |k: &str| u.and_then(|u| u.get(k)).and_then(|x| x.as_u64()).unwrap_or(0);
        let cached = n("cache_read_input_tokens");
        usage.input_tokens += n("input_tokens") + cached + n("cache_creation_input_tokens");
        usage.output_tokens += n("output_tokens");
        usage.cached_input_tokens = Some(usage.cached_input_tokens.unwrap_or(0) + cached);
        if let Some(m) = v.get("model").and_then(|m| m.as_str()) {
            model = m.to_string();
        }
        let content = v.get("content").cloned().unwrap_or(serde_json::json!([]));
        for b in content.as_array().into_iter().flatten() {
            if b.get("type").and_then(|t| t.as_str()) == Some("text") {
                text.push_str(b.get("text").and_then(|t| t.as_str()).unwrap_or(""));
            }
        }
        match v.get("stop_reason").and_then(|s| s.as_str()) {
            // 服务端那一圈搜到上限停了一下：把它这一轮原样接回去，它从断点接着做（不加「继续」）。
            Some("pause_turn") => {
                messages.as_array_mut().unwrap().push(serde_json::json!({ "role": "assistant", "content": content }));
                continue;
            }
            Some("refusal") => return Err(err("refused", "The model declined this search (stop_reason: refusal).", Some(status))),
            Some("max_tokens") => return Err(err("truncated", "The search answer was cut off by the output-token limit.", Some(status))),
            _ => {}
        }
        if text.trim().is_empty() {
            return Err(err("bad_response", "The search came back with no answer text.", Some(status)));
        }
        return Ok((text, usage, model));
    }
    Err(err("cut_off", format!("The search was still going after {SEARCH_MAX_ROUNDS} rounds."), None))
}

/// Gemini 自己的接口根：OpenAI 兼容地址去掉末尾的 `/openai`。
fn gemini_root(base: &str) -> &str {
    base.trim_end_matches('/').trim_end_matches("/openai")
}

fn gemini_search_body(req: &Request) -> serde_json::Value {
    serde_json::json!({
        "systemInstruction": { "parts": [{ "text": req.system }] },
        "contents": [{ "role": "user", "parts": [{ "text": req.user }] }],
        "tools": [{ "google_search": {} }],
    })
}

fn gemini_search_text(v: &serde_json::Value) -> Result<(String, Usage, String), Envelope> {
    let cand = v.pointer("/candidates/0");
    let finish = cand.and_then(|c| c.get("finishReason")).and_then(|f| f.as_str()).unwrap_or("");
    let mut text = String::new();
    for p in cand.and_then(|c| c.pointer("/content/parts")).and_then(|p| p.as_array()).into_iter().flatten() {
        // 思考摘要那几段（thought: true）不是回答。
        if p.get("thought").and_then(|t| t.as_bool()) == Some(true) {
            continue;
        }
        text.push_str(p.get("text").and_then(|t| t.as_str()).unwrap_or(""));
    }
    if finish == "MAX_TOKENS" {
        return Err(err("truncated", "The search answer was cut off by the output-token limit.", None));
    }
    if text.trim().is_empty() {
        let why = if finish.is_empty() { "no candidate".to_string() } else { format!("finishReason: {finish}") };
        let kind = if finish == "SAFETY" || finish == "PROHIBITED_CONTENT" { "refused" } else { "bad_response" };
        return Err(err(kind, format!("The search came back with no answer text ({why})."), None));
    }
    let u = v.get("usageMetadata");
    let n = |k: &str| u.and_then(|u| u.get(k)).and_then(|x| x.as_u64());
    let thoughts = n("thoughtsTokenCount");
    let usage = Usage {
        input_tokens: n("promptTokenCount").unwrap_or(0),
        output_tokens: n("candidatesTokenCount").unwrap_or(0) + thoughts.unwrap_or(0),
        cached_input_tokens: n("cachedContentTokenCount"),
        reasoning_tokens: thoughts,
    };
    let model = v.get("modelVersion").and_then(|m| m.as_str()).unwrap_or("").to_string();
    Ok((text, usage, model))
}

fn search_gemini(agent: &ureq::Agent, base: &str, req: &Request) -> SearchOut {
    let url = format!("{}/models/{}:generateContent", gemini_root(base), req.model);
    let headers = vec![("x-goog-api-key", req.api_key.clone())];
    let (status, v, raw) = post_json(agent, &url, &headers, &gemini_search_body(req), base)?;
    if status >= 400 {
        return Err(http_failure(status, &v, &raw));
    }
    let (text, usage, model) = gemini_search_text(&v)?;
    Ok((text, usage, if model.is_empty() { req.model.clone() } else { model }))
}

fn add_openai_usage(total: &mut Usage, u: Option<&serde_json::Value>) {
    let u = read_usage(u);
    total.input_tokens += u.input_tokens;
    total.output_tokens += u.output_tokens;
    if let Some(c) = u.cached_input_tokens {
        total.cached_input_tokens = Some(total.cached_input_tokens.unwrap_or(0) + c);
    }
    if let Some(r) = u.reasoning_tokens {
        total.reasoning_tokens = Some(total.reasoning_tokens.unwrap_or(0) + r);
    }
}

/// `/chat/completions` 那一套的一次回答 → 正文；`length` 掐断的、空的都是失败。
fn chat_answer(v: &serde_json::Value, status: u16) -> Result<String, Envelope> {
    let content = v.pointer("/choices/0/message/content").and_then(|c| c.as_str()).unwrap_or("");
    if v.pointer("/choices/0/finish_reason").and_then(|f| f.as_str()) == Some("length") {
        return Err(err("truncated", "The search answer was cut off by the output-token limit.", Some(status)));
    }
    if content.trim().is_empty() {
        return Err(err("bad_response", "The search came back with no answer text.", Some(status)));
    }
    Ok(content.to_string())
}

fn kimi_search_body(req: &Request, messages: &serde_json::Value) -> serde_json::Value {
    let mut body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "tools": [{ "type": "builtin_function", "function": { "name": "$web_search" } }],
    });
    if let Some(n) = req.max_output_tokens {
        body["max_tokens"] = serde_json::json!(n);
    }
    body
}

fn search_kimi(agent: &ureq::Agent, base: &str, req: &Request) -> SearchOut {
    let mut messages = serde_json::json!([
        { "role": "system", "content": req.system },
        { "role": "user", "content": req.user },
    ]);
    let mut usage = Usage::default();
    let url = format!("{base}/chat/completions");
    for _ in 0..SEARCH_MAX_ROUNDS {
        let (status, v, raw) = post_json(agent, &url, &bearer(req), &kimi_search_body(req, &messages), base)?;
        if status >= 400 {
            return Err(http_failure(status, &v, &raw));
        }
        add_openai_usage(&mut usage, v.get("usage"));
        // `$web_search` 是 Kimi 自己执行的：它回 tool_calls，我们把那一轮和参数原样递回去，它就带着搜到的东西接着答。
        if v.pointer("/choices/0/finish_reason").and_then(|f| f.as_str()) == Some("tool_calls") {
            let msg = v.pointer("/choices/0/message").cloned().unwrap_or(serde_json::Value::Null);
            let calls = msg.get("tool_calls").and_then(|c| c.as_array()).cloned().unwrap_or_default();
            let list = messages.as_array_mut().unwrap();
            list.push(msg);
            for c in calls {
                list.push(serde_json::json!({
                    "role": "tool",
                    "tool_call_id": c.get("id").cloned().unwrap_or(serde_json::Value::Null),
                    "name": c.pointer("/function/name").cloned().unwrap_or(serde_json::json!("$web_search")),
                    "content": c.pointer("/function/arguments").and_then(|a| a.as_str()).unwrap_or("{}"),
                }));
            }
            continue;
        }
        let text = chat_answer(&v, status)?;
        let model = v.get("model").and_then(|m| m.as_str()).unwrap_or(&req.model).to_string();
        return Ok((text, usage, model));
    }
    Err(err("cut_off", format!("The search was still going after {SEARCH_MAX_ROUNDS} rounds."), None))
}

fn qwen_search_body(req: &Request) -> serde_json::Value {
    let mut body = openai_body(req);
    body["enable_search"] = serde_json::json!(true);
    body
}

fn search_qwen(agent: &ureq::Agent, base: &str, req: &Request) -> SearchOut {
    let (status, v, raw) =
        post_json(agent, &format!("{base}/chat/completions"), &bearer(req), &qwen_search_body(req), base)?;
    if status >= 400 {
        return Err(http_failure(status, &v, &raw));
    }
    let text = chat_answer(&v, status)?;
    let mut usage = Usage::default();
    add_openai_usage(&mut usage, v.get("usage"));
    let model = v.get("model").and_then(|m| m.as_str()).unwrap_or(&req.model).to_string();
    Ok((text, usage, model))
}

/// 发一次请求，把流读完。
///
/// ⚠️⚠️ **这条路是流式的，而这不是为了好看。** 2026-08-20 实测：一份 26,615 字符的 pack
/// 在不流式的情况下 180 秒还没回话，被超时掐断，**而 DeepSeek 那边已经计了 ¥0.08**——
/// 钱花了，一个字没拿到，界面还报成「可能不是 OpenAI 兼容的接口」。
///
/// 不流式意味着三件事同时成立：整个生成期间一个字节都不到；超时只能按总时长算，
/// 于是「正在正常生成」和「卡死了」长得一模一样；掐断之后**已经付过的那部分全部作废**。
/// 流式把这三件一起解决：字节一直在来，进度是真的，掐断时也知道它当时在思考还是在写。
fn call(
    agent: &ureq::Agent,
    url: &str,
    req: &Request,
    body: &serde_json::Value,
    include_usage: bool,
    base: &str,
) -> Envelope {
    let mut body = body.clone();
    body["stream"] = serde_json::json!(true);
    if include_usage {
        body["stream_options"] = serde_json::json!({ "include_usage": true });
    }

    progress(&serde_json::json!({ "stage": "sending" }));
    let started = Instant::now();
    let resp = agent
        .post(url)
        .header("Authorization", &format!("Bearer {}", req.api_key))
        .header("Content-Type", "application/json")
        .send_json(&body);

    let mut resp = match resp {
        Ok(r) => r,
        Err(ureq::Error::Timeout(_)) => {
            return err("timeout", "The endpoint did not even send a reply header in time.", None)
        }
        Err(e) => {
            // 连不上、DNS、TLS。⚠️ `e` 里不含 key（key 在 header 里，不在 URL 里）。
            return err("network", format!("Could not reach {base} — {e}"), None);
        }
    };

    let status = resp.status().as_u16();
    if status >= 400 {
        // 出错时对方回的是一整个 JSON，不是流。照旧路走，好把厂商原话带出来。
        let text = resp.body_mut().read_to_string().unwrap_or_default();
        let parsed = serde_json::from_str::<serde_json::Value>(&text).unwrap_or(serde_json::Value::Null);
        return envelope_from_body(&parsed, status, &text, &req.model, started.elapsed().as_millis());
    }

    let mut content = String::new();
    let mut thinking = String::new();
    let mut usage: Option<serde_json::Value> = None;
    let mut model: Option<String> = None;
    let mut read_error: Option<String> = None;
    // ⛔⛔ T3(2026-08-23):**流式这条路原来从头到尾没读过 `finish_reason`。**
    // 于是被输出上限掐断的回复会带着 `ok:true` 和半份正文回来 —— 而下面 `cut_off`
    // 那里自己写着「半份稿子看起来和『删得很狠』一模一样」,这条路上它连 cut_off 都不报。
    // 第五轮实测撞到:一条回答只出来 37 个字符、986 个输出 token,信封报成功。
    let mut finish: Option<String> = None;
    let mut last_report = Instant::now();

    {
        let reader = std::io::BufReader::new(resp.body_mut().as_reader());
        for line in std::io::BufRead::lines(reader) {
            let line = match line {
                Ok(l) => l,
                Err(e) => {
                    read_error = Some(e.to_string());
                    break;
                }
            };
            let Some(payload) = line.strip_prefix("data:") else { continue };
            let payload = payload.trim();
            if payload == "[DONE]" {
                break;
            }
            let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) else { continue };
            if let Some(m) = v.get("model").and_then(|x| x.as_str()) {
                model = Some(m.to_string());
            }
            if let Some(u) = v.get("usage").filter(|u| !u.is_null()) {
                usage = Some(u.clone());
            }
            if let Some(f) = v.pointer("/choices/0/finish_reason").and_then(|x| x.as_str()) {
                finish = Some(f.to_string());
            }
            if let Some(d) = v.pointer("/choices/0/delta") {
                if let Some(t) = d.get("reasoning_content").and_then(|x| x.as_str()) {
                    thinking.push_str(t);
                }
                if let Some(t) = d.get("content").and_then(|x| x.as_str()) {
                    content.push_str(t);
                }
            }
            // 限流上报：一份长稿子有几千个 chunk，每个都发一行会把 stderr 变成瓶颈。
            if last_report.elapsed() >= Duration::from_millis(400) {
                progress(&serde_json::json!({
                    "stage": if content.is_empty() { "thinking" } else { "writing" },
                    "thinking": thinking.chars().count(),
                    "written": content.chars().count(),
                }));
                last_report = Instant::now();
            }
        }
    }

    let ms = started.elapsed().as_millis();
    let (thought_n, written_n) = (thinking.chars().count(), content.chars().count());

    if let Some(e) = read_error {
        if content.trim().is_empty() {
            // ⛔ 这里**绝不能**再报成 bad_response。2026-08-20 Ocean 撞到的就是这个：
            // 一次超时被说成「可能不是一个 OpenAI 兼容的接口」，把人指向了完全错误的方向。
            return err(
                classify_read_error(&e),
                format!(
                    "The connection ended after {}s with no briefing written. By then the model had produced {thought_n} characters of thinking and {written_n} of briefing. ({e})",
                    ms / 1000
                ),
                Some(status),
            );
        }
        // 写到一半断了。⛔ 不能把半份稿子当成压缩结果交出去——它看起来和「删得很狠」一模一样。
        return err(
            "cut_off",
            format!(
                "The briefing was cut off partway: {written_n} characters had arrived after {}s (plus {thought_n} characters of thinking). ({e})",
                ms / 1000
            ),
            Some(status),
        );
    }

    if content.trim().is_empty() {
        if thought_n > 0 {
            return err(
                "thought_only",
                format!("The model spent the whole reply thinking ({thought_n} characters) and wrote no briefing."),
                Some(status),
            );
        }
        return err("bad_response", "The stream ended without any content.", Some(status));
    }

    // ⛔⛔ T3:正文非空 + `finish_reason: "length"` = **被输出上限掐断的半份稿子**。
    // 和连接断掉(`cut_off`)是同一种损坏,只是断的人不同 —— 所以同样**不能当结果交出去**。
    // ⚠️ 钱照收:这一次的 usage 仍然报上去,界面上那句「这一次花了多少」才是真的。
    if finish.as_deref() == Some("length") {
        return err(
            "truncated",
            format!(
                "The briefing was cut off by the output-token limit: {written_n} characters had arrived after {}s (plus {thought_n} characters of thinking).",
                ms / 1000
            ),
            Some(status),
        );
    }

    Envelope::Ok {
        ok: true,
        text: content,
        usage: read_usage(usage.as_ref()),
        model: model.unwrap_or_else(|| req.model.clone()),
        ms,
    }
}

/// 响应体 → 信封。
///
/// 单独一个函数是为了**能被测试钉住**：这里判的每一条都是 2026-08-20 实测撞出来的
/// （厂商的错误原话、思考吃光额度、被 max_tokens 截断），而它们只靠一个假 key 是撞不出来的。
fn envelope_from_body(
    parsed: &serde_json::Value,
    status: u16,
    raw: &str,
    asked_model: &str,
    ms: u128,
) -> Envelope {
    // 厂商写在响应体里的那句解释,优先于我们自己那句通用的。
    // ⚠️ 也覆盖了「200 里包一个 error 对象」这种兼容端点的写法。
    if let Some(msg) = vendor_error(parsed) {
        return err(classify_with(status, &msg), msg, Some(status));
    }
    if status >= 400 {
        // 有响应体但里面没有 error 字段。带上原文,别只报一个数字。
        return err(classify(status), format!("{} — {}", http_message(status), clip(raw)), Some(status));
    }
    let content = parsed
        .pointer("/choices/0/message/content")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty());
    let Some(content) = content else {
        // ⚠️ 2026-08-20 实测踩到的那一条：正文空的,但 `reasoning_content` 里塞满了思考过程。
        //
        // 这**不是**「接口不兼容」,而这个区分很重要——它决定用户下一步该干什么:
        // 一个是「换个接口」,一个是「别把额度掐死在思考上」。原来那句笼统的
        // 「对方回来的东西看不懂」把人指向了完全错误的方向。
        let thought = parsed
            .pointer("/choices/0/message/reasoning_content")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty());
        let finish = parsed
            .pointer("/choices/0/finish_reason")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if let Some(thought) = thought {
            return err(
                "thought_only",
                format!(
                    "The model spent the whole reply thinking and wrote no briefing (finish_reason: {}). Its thinking began: {}",
                    if finish.is_empty() { "not reported" } else { finish },
                    clip(thought)
                ),
                Some(status),
            );
        }
        if finish == "length" {
            return err(
                "truncated",
                "The reply was cut off by the output-token limit before anything usable came back.".to_string(),
                Some(status),
            );
        }
        return err(
            "bad_response",
            format!("The reply had no message content: {}", clip(raw)),
            Some(status),
        );
    };

    // ⛔ T3:非流式这条原来只在**正文为空**的时候才看 `finish_reason` ——
    // 掐断了但写出了半份的那种,照样被当成成功。
    if parsed.pointer("/choices/0/finish_reason").and_then(|v| v.as_str()) == Some("length") {
        return err(
            "truncated",
            format!(
                "The briefing was cut off by the output-token limit: {} characters had arrived.",
                content.chars().count()
            ),
            Some(status),
        );
    }

    Envelope::Ok {
        ok: true,
        text: content.to_string(),
        usage: read_usage(parsed.get("usage")),
        model: parsed.get("model").and_then(|v| v.as_str()).unwrap_or(asked_model).to_string(),
        ms,
    }
}

/// `usage` 缺字段就是缺，不要拿 0 填 —— 见 `Usage::cached_input_tokens` 上的注释。
fn read_usage(u: Option<&serde_json::Value>) -> Usage {
    let Some(u) = u else { return Usage::default() };
    let n = |k: &str| u.get(k).and_then(|v| v.as_u64());
    Usage {
        input_tokens: n("prompt_tokens").unwrap_or(0),
        output_tokens: n("completion_tokens").unwrap_or(0),
        // DeepSeek 的名字。OpenAI 自己走 `prompt_tokens_details.cached_tokens`，也认一下，
        // 因为「OpenAI 兼容」的端点抄的往往是后者。
        cached_input_tokens: n("prompt_cache_hit_tokens")
            .or_else(|| u.pointer("/prompt_tokens_details/cached_tokens").and_then(|v| v.as_u64())),
        reasoning_tokens: u
            .pointer("/completion_tokens_details/reasoning_tokens")
            .and_then(|v| v.as_u64()),
    }
}

/// 厂商写在响应体里的那个报错对象。⚠️ Gemini 的 OpenAI 兼容地址有时把它包在数组里：
/// `[{"error":{…}}]`（2026-10-24 假 key 实测）—— 不拆这一层，它的原话就丢了。
fn vendor_error(parsed: &serde_json::Value) -> Option<String> {
    let p = parsed.as_array().and_then(|a| a.first()).unwrap_or(parsed);
    p.get("error").and_then(api_error_message)
}

/// `classify`，再加一条：Gemini 对坏 key 回的是 **400** 不是 401（「Please pass a valid API key」）。
/// ⚠️ 不认出来的话，界面会说「接口返回了一个错误」，前端也会以为是「连不上」而不是「key 不对」。
fn classify_with(status: u16, message: &str) -> &'static str {
    if status == 400 && message.contains("API key") && message.to_lowercase().contains("valid") {
        return "auth";
    }
    classify(status)
}

fn api_error_message(e: &serde_json::Value) -> Option<String> {
    if let Some(s) = e.as_str() {
        return Some(s.to_string());
    }
    e.get("message").and_then(|v| v.as_str()).map(|s| s.to_string())
}

/// 流读到一半断了，是哪一类。
///
/// ⛔ **这里没有 `bad_response` 这个选项，而那是有意的。** 2026-08-20 Ocean 撞到的原话是
/// 一次 180 秒超时被报成「可能不是一个 OpenAI 兼容的接口」——两者对应的下一步动作完全不同
/// （一个是「等久一点 / 换模型」，一个是「换接口」），塌成一句就是把人指错方向。
/// 连接已经建立、状态码已经是 2xx，「接口不兼容」在这一步在逻辑上就不可能成立。
fn classify_read_error(e: &str) -> &'static str {
    if e.contains("timeout") {
        "timeout"
    } else {
        "network"
    }
}

/// 状态码 → 界面上说哪一句话。这三类（key 不对 / 余额不足 / 限流）是 §6.2 点名要求
/// 「要在界面上说出来」的。
fn classify(code: u16) -> &'static str {
    match code {
        401 | 403 => "auth",
        402 => "quota",
        429 => "rate_limit",
        500..=599 => "upstream",
        _ => "http",
    }
}

fn http_message(code: u16) -> String {
    match classify(code) {
        "auth" => "The endpoint rejected the API key.".into(),
        "quota" => "The account is out of balance.".into(),
        "rate_limit" => "Rate limited — too many requests just now.".into(),
        "upstream" => format!("The provider had a server-side error (HTTP {code})."),
        _ => format!("The endpoint answered HTTP {code}."),
    }
}

/// 报错里回显对方的原文时截断 —— 一个坏掉的端点可能吐一整页 HTML。
fn clip(s: &str) -> String {
    let s = s.trim();
    if s.chars().count() <= 300 {
        return s.to_string();
    }
    format!("{}…", s.chars().take(300).collect::<String>())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(base: &str, key: &str) -> Request {
        Request {
            base_url: base.into(),
            api_key: key.into(),
            model: "deepseek-chat".into(),
            system: "s".into(),
            user: "u".into(),
            max_output_tokens: Some(16),
            reasoning_effort: None,
            thinking_disabled: false,
            timeout_secs: 30,
            kind: String::new(),
            protocol: String::new(),
            temperature: None,
            key_check_path: String::new(),
            search: String::new(),
        }
    }

    fn kind_of(e: &Envelope) -> &'static str {
        match e {
            Envelope::Err { kind, .. } => kind,
            Envelope::Ok { .. } => "ok",
            Envelope::Balance { .. } => "balance",
            Envelope::Models { .. } => "models",
        }
    }

    // 明文 http 会把 key 发到线上。这条必须在**发出请求之前**就拦下来。
    #[test]
    fn plain_http_is_refused_before_anything_is_sent() {
        assert_eq!(kind_of(&run(req("http://api.example.com", "sk-x"))), "bad_config");
    }

    #[test]
    fn an_empty_key_is_refused_before_anything_is_sent() {
        assert_eq!(kind_of(&run(req("https://api.example.com", "   "))), "bad_config");
    }

    // 查余额也带着 key。明文 http 那道闸必须排在「是不是查余额」前面。
    #[test]
    fn a_balance_query_over_plain_http_is_refused_before_anything_is_sent() {
        let mut r = req("http://api.example.com", "sk-x");
        r.kind = "balance".into();
        assert_eq!(kind_of(&run(r)), "bad_config");
    }

    // §6.2 约束 4 点名的三类，界面要分别说话，所以它们不能塌成同一个 kind。
    #[test]
    fn the_three_failures_the_ui_must_name_are_kept_apart() {
        assert_eq!(classify(401), "auth");
        assert_eq!(classify(402), "quota");
        assert_eq!(classify(429), "rate_limit");
        assert_ne!(classify(402), classify(429));
    }

    // 「这家端点没报缓存命中」和「一次都没命中」是两件事。把前者显示成后者，第 5 步的实测就说谎了。
    #[test]
    fn a_missing_cache_field_stays_unknown_rather_than_zero() {
        let u = read_usage(Some(&serde_json::json!({
            "prompt_tokens": 100, "completion_tokens": 20
        })));
        assert_eq!(u.input_tokens, 100);
        assert_eq!(u.cached_input_tokens, None);
    }

    #[test]
    fn deepseeks_cache_field_is_read() {
        let u = read_usage(Some(&serde_json::json!({
            "prompt_tokens": 100, "completion_tokens": 20, "prompt_cache_hit_tokens": 64
        })));
        assert_eq!(u.cached_input_tokens, Some(64));
    }

    // 「OpenAI 兼容」的端点抄的常常是 OpenAI 那套字段名。
    #[test]
    fn the_openai_spelling_of_the_cache_field_is_read_too() {
        let u = read_usage(Some(&serde_json::json!({
            "prompt_tokens": 100,
            "completion_tokens": 20,
            "prompt_tokens_details": { "cached_tokens": 32 }
        })));
        assert_eq!(u.cached_input_tokens, Some(32));
    }

    // 2026-08-20 实测：V4-Flash 把整个回复都用来思考了,content 是空字符串。
    // 那不是「接口不兼容」,把它报成 bad_response 会把人指向换接口,而正确的动作是别掐额度。
    #[test]
    fn a_reply_that_is_all_thinking_says_so_instead_of_blaming_the_endpoint() {
        let body = serde_json::json!({
            "model": "deepseek-v4-flash",
            "choices": [{
                "index": 0,
                "finish_reason": "length",
                "message": { "role": "assistant", "content": "", "reasoning_content": "Let me analyze this task carefully." }
            }]
        });
        let e = envelope_from_body(&body, 200, "", "m", 1);
        assert_eq!(kind_of(&e), "thought_only");
    }

    #[test]
    fn a_truncated_reply_with_no_thinking_is_named_as_truncated() {
        let body = serde_json::json!({
            "choices": [{ "index": 0, "finish_reason": "length", "message": { "content": "" } }]
        });
        assert_eq!(kind_of(&envelope_from_body(&body, 200, "", "m", 1)), "truncated");
    }

    // ⛔⛔ T3(2026-08-23,第五轮实测):**正文非空**的那一半原来漏了。
    // 一份被输出上限掐断的压缩稿,看起来和「删得很狠」一模一样 —— 交出去就是
    // 让用户拿半份稿子去核对,而信封上写着「成功」。
    #[test]
    fn a_truncated_reply_that_did_write_something_is_still_a_failure() {
        let body = serde_json::json!({
            "choices": [{
                "index": 0,
                "finish_reason": "length",
                "message": { "content": "#1 [t] 前半份写出来了,后半份没" }
            }]
        });
        assert_eq!(kind_of(&envelope_from_body(&body, 200, "", "m", 1)), "truncated");
    }

    // ⚠️ 反过来那一半:正常收尾的回复**不许**被这条新判断误伤。
    #[test]
    fn a_reply_that_finished_normally_is_still_ok() {
        let body = serde_json::json!({
            "choices": [{
                "index": 0,
                "finish_reason": "stop",
                "message": { "content": "#1 [t] 整份都在。" }
            }]
        });
        assert_eq!(kind_of(&envelope_from_body(&body, 200, "", "m", 1)), "ok");
    }

    // 「思考」按输出价计费,而 §6.2 那张成本表是按「2000 输出」算的。
    // 混进 output_tokens 里就看不出这笔钱花在哪儿。
    #[test]
    fn thinking_tokens_are_reported_on_their_own() {
        let u = read_usage(Some(&serde_json::json!({
            "prompt_tokens": 100,
            "completion_tokens": 4200,
            "completion_tokens_details": { "reasoning_tokens": 4000 }
        })));
        assert_eq!(u.output_tokens, 4200);
        assert_eq!(u.reasoning_tokens, Some(4000));
    }

    // ⛔ 2026-08-20 Ocean 撞到的原话：一次 180 秒超时被报成「可能不是一个 OpenAI 兼容的
    // 接口」。超时和「接口不兼容」是两个完全不同的下一步动作，塌成一句就是把人指错方向。
    // 这条钉的是分类，不是措辞。
    #[test]
    fn a_timeout_is_never_reported_as_an_incompatible_endpoint() {
        // Ocean 那次界面上的原文就是 "Could not read the reply — timeout: global"。
        assert_eq!(classify_read_error("timeout: global"), "timeout");
        assert_eq!(classify_read_error("timeout: recv body"), "timeout");
        assert_eq!(classify_read_error("connection reset by peer"), "network");
        for e in ["timeout: global", "connection reset by peer"] {
            assert_ne!(classify_read_error(e), "bad_response");
        }
    }

    // ---- P9U-3：每家都能用 ----

    fn claude_req(model: &str, effort: Option<&str>) -> Request {
        let mut r = req("https://api.anthropic.com", "sk-ant-x");
        r.protocol = "anthropic".into();
        r.model = model.into();
        r.max_output_tokens = None;
        r.reasoning_effort = effort.map(String::from);
        r.temperature = Some(0.2);
        r
    }

    // 新的 Claude 模型对温度回 400；Messages 接口必须给 max_tokens；思考力度走 output_config.effort。
    #[test]
    fn a_claude_request_has_no_temperature_and_says_how_long_it_may_write() {
        let b = anthropic_body(&claude_req("claude-opus-5-5", Some("low")));
        assert!(b.get("temperature").is_none());
        assert_eq!(b["max_tokens"], 64_000);
        assert_eq!(b["output_config"]["effort"], "low");
        assert!(b.get("reasoning_effort").is_none() && b.get("thinking").is_none());
        assert_eq!(b["system"][0]["cache_control"]["type"], "ephemeral");
        assert_eq!(b["messages"][0]["role"], "user");
        assert_eq!(b["fallbacks"], "default");
    }

    // Haiku 5.5 没有备用模型 —— 带上 fallbacks 会 400。「默认」力度就什么都不发。
    #[test]
    fn a_model_without_a_fallback_is_not_sent_one() {
        let b = anthropic_body(&claude_req("claude-haiku-5-5", None));
        assert!(b.get("fallbacks").is_none());
        assert!(b.get("output_config").is_none());
    }

    fn feed_all(events: &[serde_json::Value]) -> AnthropicStream {
        let mut s = AnthropicStream::default();
        for e in events {
            if !s.feed(e) {
                break;
            }
        }
        s
    }

    #[test]
    fn a_claude_stream_is_read_into_text_and_usage() {
        let s = feed_all(&[
            serde_json::json!({"type":"message_start","message":{"model":"claude-opus-5-5","usage":{"input_tokens":100,"cache_read_input_tokens":2000,"cache_creation_input_tokens":0,"output_tokens":1}}}),
            serde_json::json!({"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}),
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"hm"}}),
            serde_json::json!({"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"#1 [t] "}}),
            serde_json::json!({"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"整份。"}}),
            serde_json::json!({"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":42}}),
            serde_json::json!({"type":"message_stop"}),
        ]);
        let Envelope::Ok { text, usage, model, .. } = s.finish(None, 200, "asked", 5) else { panic!("not ok") };
        assert_eq!(text, "#1 [t] 整份。");
        assert_eq!(model, "claude-opus-5-5");
        assert_eq!(usage.input_tokens, 2100);
        assert_eq!(usage.cached_input_tokens, Some(2000));
        assert_eq!(usage.output_tokens, 42);
        assert_eq!(usage.reasoning_tokens, None);
    }

    // 拒答是 HTTP 200 —— 半截正文也不能当结果交出去。
    #[test]
    fn a_refusal_is_a_failure_even_with_some_text() {
        let s = feed_all(&[
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"#1 半"}}),
            serde_json::json!({"type":"message_delta","delta":{"stop_reason":"refusal"},"usage":{"output_tokens":3}}),
            serde_json::json!({"type":"message_stop"}),
        ]);
        assert_eq!(kind_of(&s.finish(None, 200, "m", 1)), "refused");
    }

    #[test]
    fn a_claude_reply_cut_by_max_tokens_is_truncated() {
        let s = feed_all(&[
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"#1 前半"}}),
            serde_json::json!({"type":"message_delta","delta":{"stop_reason":"max_tokens"}}),
        ]);
        assert_eq!(kind_of(&s.finish(None, 200, "m", 1)), "truncated");
    }

    #[test]
    fn an_overloaded_event_mid_stream_is_the_providers_problem() {
        let s = feed_all(&[
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"#1"}}),
            serde_json::json!({"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}),
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"never read"}}),
        ]);
        assert_eq!(s.content, "#1");
        assert_eq!(kind_of(&s.finish(None, 200, "m", 1)), "upstream");
    }

    // 服务端换模型接着答：前面半截留着，后面接上，`fallback` 块本身不进正文。
    #[test]
    fn a_server_side_fallback_keeps_writing_on_the_same_text() {
        let s = feed_all(&[
            serde_json::json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"#1 前"}}),
            serde_json::json!({"type":"content_block_start","index":1,"content_block":{"type":"fallback","from":{"model":"a"},"to":{"model":"b"}}}),
            serde_json::json!({"type":"content_block_delta","index":2,"delta":{"type":"text_delta","text":"后"}}),
            serde_json::json!({"type":"message_delta","delta":{"stop_reason":"end_turn"}}),
        ]);
        let Envelope::Ok { text, .. } = s.finish(None, 200, "m", 1) else { panic!("not ok") };
        assert_eq!(text, "#1 前后");
    }

    // Claude 的报错体是 {"type":"error","error":{"type":…,"message":…}} —— 厂商原话要带出来。
    #[test]
    fn a_claude_error_body_keeps_the_vendors_words() {
        let body = serde_json::json!({"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}});
        match envelope_from_body(&body, 401, "", "m", 1) {
            Envelope::Err { kind, message, .. } => {
                assert_eq!(kind, "auth");
                assert_eq!(message, "invalid x-api-key");
            }
            _ => panic!("not an error"),
        }
    }

    // 2026-10-24 假 key 实测：Gemini 对坏 key 回 400，报错有时还包在数组里。
    #[test]
    fn geminis_bad_key_is_a_refused_key_not_a_broken_endpoint() {
        let arr = serde_json::json!([{ "error": { "code": 400, "message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT" } }]);
        assert_eq!(kind_of(&envelope_from_body(&arr, 400, "", "m", 1)), "auth");
        assert_eq!(kind_of(&models_from_body(400, r#"{"error":{"code":400,"message":"Please pass a valid API key"}}"#, "b")), "auth");
        // 别的 400 还是 400
        assert_eq!(classify_with(400, "max_tokens is too large"), "http");
    }

    #[test]
    fn model_lists_are_read_the_same_way_for_every_vendor() {
        // OpenAI / DeepSeek / Kimi …
        let e = models_from_body(200, r#"{"object":"list","data":[{"id":"gpt-x"},{"id":"gpt-y"}]}"#, "b");
        let Envelope::Models { models, .. } = e else { panic!() };
        assert_eq!(models, vec!["gpt-x", "gpt-y"]);
        // Gemini 带 `models/` 前缀
        let e = models_from_body(200, r#"{"data":[{"id":"models/gemini-9-flash"}]}"#, "b");
        let Envelope::Models { models, .. } = e else { panic!() };
        assert_eq!(models, vec!["gemini-9-flash"]);
        // Claude
        let e = models_from_body(200, r#"{"data":[{"type":"model","id":"claude-opus-5-5","display_name":"Claude Opus 5.5"}],"has_more":false}"#, "b");
        let Envelope::Models { models, .. } = e else { panic!() };
        assert_eq!(models, vec!["claude-opus-5-5"]);
    }

    // 不给列表 ≠ 出错；key 不对必须和它分开（前端拿 auth 去试同一家另一个地区的地址）。
    #[test]
    fn no_model_list_and_a_refused_key_are_told_apart() {
        assert_eq!(kind_of(&models_from_body(404, "", "b")), "unsupported");
        assert_eq!(kind_of(&models_from_body(401, r#"{"error":{"message":"bad key"}}"#, "b")), "auth");
        assert_eq!(kind_of(&models_from_body(200, "<html>", "b")), "bad_response");
    }

    // 温度只在调用方要发的时候才进请求体（OpenAI 的推理模型对 0.2 回 400）。
    #[test]
    fn temperature_is_only_sent_when_asked_for() {
        let mut r = req("https://api.example.com", "k");
        assert!(openai_body(&r).get("temperature").is_none());
        r.temperature = Some(0.2);
        assert_eq!(openai_body(&r)["temperature"], 0.2);
    }

    // ---- P9U-4：跟进的联网搜索，每家一种接法 ----

    fn search_req(search: &str, model: &str) -> Request {
        let mut r = req("https://x", "k");
        r.kind = "search".into();
        r.search = search.into();
        r.model = model.into();
        r.max_output_tokens = None;
        r
    }

    #[test]
    fn each_vendor_is_asked_with_its_own_search_tool() {
        let o = openai_search_body(&search_req("openai", "gpt-x"));
        assert_eq!(o["tools"][0]["type"], "web_search");
        assert_eq!(o["instructions"], "s");
        assert_eq!(o["input"], "u");
        assert!(o.get("temperature").is_none());

        let c = anthropic_search_body(&search_req("anthropic", "claude-opus-5-5"), &serde_json::json!([]));
        assert_eq!(c["tools"][0]["type"], "web_search_20260209");
        assert_eq!(c["tools"][0]["name"], "web_search");
        assert!(c["max_tokens"].as_u64().unwrap() > 0);
        let h = anthropic_search_body(&search_req("anthropic", "claude-haiku-5-5"), &serde_json::json!([]));
        assert_eq!(h["tools"][0]["type"], "web_search_20250305", "the basic variant for other models");
        assert!(h.get("fallbacks").is_none());

        let g = gemini_search_body(&search_req("gemini", "gemini-x"));
        assert!(g["tools"][0].get("google_search").is_some());
        assert_eq!(gemini_root("https://generativelanguage.googleapis.com/v1beta/openai"), "https://generativelanguage.googleapis.com/v1beta");

        let k = kimi_search_body(&search_req("kimi", "kimi-x"), &serde_json::json!([]));
        assert_eq!(k["tools"][0]["function"]["name"], "$web_search");
        assert_eq!(k["tools"][0]["type"], "builtin_function");

        let q = qwen_search_body(&search_req("qwen", "qwen-x"));
        assert_eq!(q["enable_search"], true);
    }

    #[test]
    fn an_unknown_search_is_unsupported_not_sent() {
        let mut r = search_req("deepseek", "m");
        r.base_url = "https://api.deepseek.com".into();
        assert_eq!(kind_of(&run(r)), "unsupported");
    }

    #[test]
    fn openais_answer_text_is_read_out_of_the_output_items() {
        let v = serde_json::json!({
            "status": "completed", "model": "gpt-x",
            "output": [
                {"type": "web_search_call", "status": "completed"},
                {"type": "message", "content": [{"type": "output_text", "text": "{\"findings\":[]}"}]}
            ],
            "usage": {"input_tokens": 10, "output_tokens": 5, "output_tokens_details": {"reasoning_tokens": 2}}
        });
        let (text, usage, model) = openai_search_text(&v).ok().unwrap();
        assert_eq!(text, "{\"findings\":[]}");
        assert_eq!((usage.input_tokens, usage.output_tokens, usage.reasoning_tokens), (10, 5, Some(2)));
        assert_eq!(model, "gpt-x");
        let cut = serde_json::json!({"status": "incomplete", "incomplete_details": {"reason": "max_output_tokens"}});
        assert_eq!(kind_of(&openai_search_text(&cut).err().unwrap()), "truncated");
    }

    #[test]
    fn geminis_answer_skips_its_thought_parts() {
        let v = serde_json::json!({
            "candidates": [{"finishReason": "STOP", "content": {"parts": [
                {"text": "thinking…", "thought": true}, {"text": "{}"}
            ]}}],
            "usageMetadata": {"promptTokenCount": 7, "candidatesTokenCount": 3, "thoughtsTokenCount": 4},
            "modelVersion": "gemini-x"
        });
        let (text, usage, _) = gemini_search_text(&v).ok().unwrap();
        assert_eq!(text, "{}");
        assert_eq!((usage.output_tokens, usage.reasoning_tokens), (7, Some(4)));
        let blocked = serde_json::json!({"candidates": [{"finishReason": "SAFETY", "content": {"parts": []}}]});
        assert_eq!(kind_of(&gemini_search_text(&blocked).err().unwrap()), "refused");
    }

    #[test]
    fn a_chat_search_answer_cut_by_length_is_a_failure() {
        let v = serde_json::json!({"choices": [{"finish_reason": "length", "message": {"content": "{\"fin"}}]});
        assert_eq!(kind_of(&chat_answer(&v, 200).err().unwrap()), "truncated");
        let ok = serde_json::json!({"choices": [{"finish_reason": "stop", "message": {"content": "{}"}}]});
        assert_eq!(chat_answer(&ok, 200).ok().unwrap(), "{}");
    }

    #[test]
    fn a_page_of_html_from_a_broken_endpoint_is_clipped() {
        let long = "x".repeat(5000);
        assert!(clip(&long).chars().count() <= 301);
    }
}
