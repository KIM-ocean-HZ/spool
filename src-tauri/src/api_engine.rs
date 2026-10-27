//! 形态 C 的接线端（WORKPLAN-2026-08-20 §6.2 / §6.4.1 / §9 第 4 步）。
//!
//! 这个文件负责的只有一件事：**把请求交给 `spool-ai` 子进程，把信封收回来。**
//! 它自己**一个 socket 都不开**，也没有任何 HTTP/TLS 依赖——`src-tauri/Cargo.toml` 里
//! 一个都没有，`cargo tree` 可以当场验。出网发生在另一个可执行文件里，那是 §6.2 选形态 C
//! 而不是形态 A 的**全部理由**：主进程「不发网络请求」因此仍然是能被外人验证的架构性质，
//! 而不是一句意图承诺。
//!
//! ⛔ **不要把 ureq / reqwest 之类的东西加进主 crate**，哪怕只是「放着不用」。
//!
//! # 和引擎槽（形态 B）的关系
//!
//! 形态 B（`engine.rs`：用户自己装的 claude / codex / gemini）**没有被取代**，两条路并行：
//! B 一分钱不花、一个 key 不填，C 是给不想装 CLI 的人的第二条路。所以这里**不复用**
//! `engine.rs` 的串行队列——它守的是「两个 CLI 同时经 MCP 往库里写」这个竞争，而这条路
//! **一个字都不往库里写**（§9 第 4 步：先不接 `supersedes` 写入），没有那个竞争要守。
//! 它自己的并发闸在下面 `RUNNING`。

use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::mcp::{compress_messages_for_api, keep_pack_boundaries, split_cuts, CompressLevel};

/// 一次只跑一个。和 `engine.rs` 一样，闸在 Rust 这边而不是只在 JS 队列里——第二个窗口
/// 或者一次手工 invoke 否则就能起第二个进程，而取消按钮只握得住一个。
static RUNNING: AtomicBool = AtomicBool::new(false);
/// 取消是从另一个线程来的（命令跑在阻塞线程上），只能靠这个把子进程的句柄递过去。
static CHILD: Mutex<Option<Arc<Mutex<Option<Child>>>>> = Mutex::new(None);
/// ⛔⛔ **是用户按了「停下」，不是出事了**（2026-08-23，Ocean 撞到）。
///
/// 他按下停下之后，屏幕上弹的是：**「找不到负责联网的那个小程序（spool-ai）。
/// 重装一次 Spool 应该能修好。」** —— 一个让人去重装软件的建议，而他只是点了停止。
///
/// 病根：取消把子进程杀了，于是 stdout 是空的，而「stdout 空」这条路只有一种解释
/// （子进程死在产出信封之前 = 装坏了）。**取消走的是同一条路，于是被诊断成装坏了。**
/// ⚠️ 少了这个标志就分辨不出来 —— 两种情况在 stdout 上长得一模一样。
static CANCELLED: AtomicBool = AtomicBool::new(false);

/// ⚠️ 上限 2026-08-20 从 15 分钟提到 30 分钟，因为「几十秒的调用」这个前提是错的。
///
/// 实测：一份 26,615 字符的 pack，V4-Flash 跑到 180 秒**还没写完**就被掐了，
/// 而那一次 DeepSeek 已经计了 ¥0.08 —— 钱花了，一个字没拿到。会思考的模型要先想再写，
/// 输出又和输入一个量级，几分钟是正常的，不是卡住。
///
/// 现在流式了，所以「还在正常生成」和「真的卡死」在界面上分得开（字数一直在涨），
/// 这个上限只是最后一道闸，不再兼职「判断它是不是卡住了」。
fn clamp_timeout(secs: u64) -> u64 {
    secs.clamp(10, 1800)
}

/// 找 `spool-ai`。
///
/// 装机后它就躺在主程序旁边（Tauri 的 `externalBin` 会把它放进 `Contents/MacOS/`，
/// 并且跟主程序一起签名/公证）。开发时它在 sidecar crate 自己的 target 里。
///
/// ⚠️ 两条都是**固定位置**，不查 PATH。PATH 上的同名程序是别人的东西，
/// 而我们要往它 stdin 里写一个 API key。
fn sidecar_path() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let name = if cfg!(windows) { "spool-ai.exe" } else { "spool-ai" };
    if let Some(dir) = exe.parent() {
        let beside = dir.join(name);
        if beside.is_file() {
            return Ok(beside);
        }
    }
    // 开发时：`cargo build` 在 sidecar crate 里产出的那个。debug 优先，因为开发时改的是它。
    let here = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("sidecar/target");
    for profile in ["debug", "release"] {
        let p = here.join(profile).join(name);
        if p.is_file() {
            return Ok(p);
        }
    }
    Err(format!(
        "the AI sidecar ({name}) was not found beside Spool — reinstall, or run `cargo build` in src-tauri/sidecar"
    ))
}

/// 界面拿到的东西。失败也走这里，**不走 `Err`**——§6.2 约束 4：
/// 「超时、余额不足、限流都要在界面上说出来」，而一个 `Err(String)` 在界面上只会变成
/// 一句「失败了」。`kind` 让界面能分别说话，`message` 是给「详情」的原文。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressOutcome {
    pub ok: bool,
    /// 压缩稿本体（已经把「这次删了什么」那一段切掉）。失败时为空。
    pub text: String,
    /// 模型自己交代的「这一次删/合并了哪几类东西」。
    /// ⚠️ `None` 是有意义的一种结果：它**没说**。界面必须把这件事说出来，不能显示成「什么都没删」。
    pub cuts: Option<String>,
    pub kind: Option<String>,
    pub message: Option<String>,
    pub status: Option<u16>,
    pub input_tokens: u64,
    pub output_tokens: u64,
    /// ⚠️ `None` = **这家端点没报缓存命中**，不是「一次都没命中」。
    /// §6.2 那个「一到三分钱」全建立在缓存上，而那是估算；把「不知道」显示成 0 会让实测说谎。
    pub cached_input_tokens: Option<u64>,
    /// 「思考」烧掉的 token。⚠️ 它们按**输出价**计费（最贵的那一档），而 §6.2 那张成本表
    /// 是按「2,000 输出」算的。单独一栏，否则这笔钱看不出花在了哪儿。
    pub reasoning_tokens: Option<u64>,
    pub ms: u128,
    /// 端点回报的实际模型名——按次付费的时候，「我以为在用 Flash」和「实际在用 Pro」差 3 倍。
    pub model: Option<String>,
}

impl CompressOutcome {
    fn failed(kind: &str, message: String, status: Option<u16>) -> Self {
        Self {
            ok: false,
            text: String::new(),
            cuts: None,
            kind: Some(kind.to_string()),
            message: Some(message),
            status,
            input_tokens: 0,
            output_tokens: 0,
            cached_input_tokens: None,
            reasoning_tokens: None,
            ms: 0,
            model: None,
        }
    }
}

/// 压一份 pack。
///
/// ⚠️ `api_key` 从前端传进来，在这里**只做一件事**：写进子进程的 stdin。
/// 它不进 argv（`ps` 能看到任何进程的完整命令行）、不进环境变量（子进程的环境在 macOS 上
/// 也可被同用户读到）、不进日志、不进错误信息。
/// P9U-1 (Ocean 2026-10-24: 「本身的逻辑应该是 CLI 和 API 都可以使用的，既然 codex CLI 已经接入了，这两个
/// 功能就不应该被锁住」) — the same question asked of the CLI on this machine instead of an API key.
/// Everything the frontend already sends for an engine run, nothing about an endpoint.
#[derive(serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CliRoute {
    pub engine: Option<String>,
    pub model: Option<String>,
    pub effort: Option<String>,
    pub manual_path: Option<String>,
}

/// One plain CLI run (engine.rs `run_action` with a system prompt: no tools, no MCP) turned into the
/// outcome the API road returns, so whatever reads a `CompressOutcome` reads both the same way.
static CLI_RUN: AtomicBool = AtomicBool::new(false);

fn ask_cli(cli: &CliRoute, system: &str, user: &str, timeout_secs: u64) -> CompressOutcome {
    CLI_RUN.store(true, Ordering::SeqCst);
    let outcome = ask_cli_inner(cli, system, user, timeout_secs);
    CLI_RUN.store(false, Ordering::SeqCst);
    outcome
}

fn ask_cli_inner(cli: &CliRoute, system: &str, user: &str, timeout_secs: u64) -> CompressOutcome {
    let started = std::time::Instant::now();
    let preferred = cli.engine.as_deref().and_then(crate::engine::EngineKind::parse);
    let quiet: std::sync::Arc<dyn Fn(crate::engine::Progress) + Send + Sync> = std::sync::Arc::new(|_| {});
    let run = crate::engine::run_action(
        preferred,
        cli.manual_path.as_deref(),
        user,
        timeout_secs,
        2,
        false,
        false,
        cli.model.as_deref(),
        cli.effort.as_deref(),
        quiet,
        Some(system),
    );
    match run {
        Ok((kind, env)) if !env.is_error && !env.result.trim().is_empty() => CompressOutcome {
            ok: true,
            text: env.result,
            cuts: None,
            kind: None,
            message: None,
            status: None,
            input_tokens: env.usage.input_tokens.unwrap_or(0),
            output_tokens: env.usage.output_tokens.unwrap_or(0),
            cached_input_tokens: None,
            reasoning_tokens: None,
            ms: started.elapsed().as_millis(),
            model: Some(env.usage.model.unwrap_or_else(|| kind.as_str().to_string())),
        },
        Ok((kind, env)) => CompressOutcome::failed(
            "engine",
            if env.result.trim().is_empty() {
                format!("{} came back with nothing.", kind.as_str())
            } else {
                env.result
            },
            None,
        ),
        Err(e) if e.contains(crate::engine::CANCELLED_MARKER) => {
            CompressOutcome::failed("cancelled", "stopped by the user".into(), None)
        }
        Err(e) => CompressOutcome::failed("engine", e, None),
    }
}

/// P9U-1 — 压缩 on the CLI road: the very prompt `compress_pack_via_api` sends, the very checks after.
#[tauri::command]
pub async fn compress_pack_via_cli(
    app: tauri::AppHandle,
    pack_text: String,
    level: String,
    timeout_secs: u64,
    cli: CliRoute,
) -> Result<CompressOutcome, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a compression run is already in flight".into());
    }
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        let level = CompressLevel::parse(&level).unwrap_or(CompressLevel::Conservative);
        let (system, user) = compress_messages_for_api(&pack_text, level);
        let mut outcome = ask_cli(&cli, &system, &user, timeout_secs);
        if outcome.ok {
            outcome.text = keep_pack_boundaries(&pack_text, &outcome.text);
        }
        outcome
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    Ok(out.unwrap_or_else(|e| CompressOutcome::failed("internal", e.to_string(), None)))
}

/// P9U-1 — 过期检测 on the CLI road: same prompt, same verbatim gate over what comes back.
#[tauri::command]
pub async fn stale_scan_via_cli(
    app: tauri::AppHandle,
    pack_text: String,
    timeout_secs: u64,
    cli: CliRoute,
) -> Result<StaleScan, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let pack_for_gate = pack_text.clone();
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        let (system, user) = crate::mcp::stale_messages_for_api(&pack_text);
        ask_cli(&cli, &system, &user, timeout_secs)
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    let outcome = out.unwrap_or_else(|e| CompressOutcome::failed("internal", e.to_string(), None));
    let (proposals, dropped) = if outcome.ok {
        gate_proposals(&outcome.text, &pack_for_gate)
    } else {
        (Vec::new(), Vec::new())
    };
    Ok(StaleScan { outcome, proposals, dropped })
}

/// P9U-3（Ocean 10-24 第 188 条：「用户放入每家模型的 key 都能正常使用」）—— 这一家怎么说话。
///
/// ⚠️ 厂商表只放在一处（`src/lib/ai/vendors.ts`），这里只收它算好的结果：说哪种协议、发不发温度、
/// 要不要给输出上限。「思考力度」照旧是 `reasoning` 那个参数，⭐ 前端已经把这家不认的值滤掉了。
/// `None`（老的调用方、实测台）= P9U-3 之前那条路：OpenAI 那一套 + 温度 0.2。
#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiWire {
    #[serde(default)]
    pub protocol: String,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub max_output_tokens: Option<u32>,
}

impl ApiWire {
    fn or_legacy(w: Option<ApiWire>) -> ApiWire {
        w.unwrap_or(ApiWire { protocol: String::new(), temperature: Some(0.2), max_output_tokens: None })
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn compress_pack_via_api(
    app: tauri::AppHandle,
    pack_text: String,
    level: String,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<CompressOutcome, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a compression run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let out = tauri::async_runtime::spawn_blocking(move || {
        run_blocking(&app, pack_text, level, base_url, api_key, model, reasoning, &wire, timeout_secs)
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    match out {
        Ok(o) => Ok(o),
        Err(e) => Ok(CompressOutcome::failed("internal", e.to_string(), None)),
    }
}

#[allow(clippy::too_many_arguments)]
fn run_blocking(
    app: &tauri::AppHandle,
    pack_text: String,
    level: String,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: &ApiWire,
    timeout_secs: u64,
) -> CompressOutcome {
    // 提示词跟着 app 的语言走，和 MCP 那条路每次请求重读一次是同一个做法。
    if let Ok(dir) = tauri::Manager::path(app).app_config_dir() {
        crate::mcp::refresh_lang(&dir);
    }
    let level = match CompressLevel::parse(&level) {
        Some(l) => l,
        // 设置里存了个不认识的值（settings.json 是可以手改的，见 DESIGN_LIBRARY_TRANSFER）。
        // 掉回最保守那档，不要因此让一次压缩失败。
        None => CompressLevel::Conservative,
    };
    let (system, user) = compress_messages_for_api(&pack_text, level);

    let bin = match sidecar_path() {
        Ok(p) => p,
        Err(e) => return CompressOutcome::failed("no_sidecar", e, None),
    };
    let timeout_secs = clamp_timeout(timeout_secs);
    let request = sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, wire, timeout_secs);
    let payload = match serde_json::to_vec(&request) {
        Ok(v) => v,
        Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
    };
    let mut outcome = spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()));
    // P4-3：模型丢掉的 pack 首尾两行由代码补回来（`split_cuts` 已经在信封里切过了）。
    // ⚠️ 对的是**送出去的那一份**（摘过批注的）：首尾两行摘的时候原样留着，放回去时也原样留着。
    if outcome.ok {
        outcome.text = keep_pack_boundaries(&pack_text, &outcome.text);
    }
    outcome
}

/// 递给 `spool-ai` 的那个请求。
///
/// ⚠️ **拆出来是为了让第二轮实测量的是产品本身**（WORKPLAN §9.6.3）。自动化实测台
/// 绕开界面直接喂子进程，如果它自己另拼一份请求，测出来的就是那份脚本，不是 Spool。
/// 两边共用这一个函数，参数一旦改了，实测跟着改。
#[allow(clippy::too_many_arguments)]
fn sidecar_request(
    base_url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
    reasoning: &str,
    wire: &ApiWire,
    timeout_secs: u64,
) -> serde_json::Value {
    serde_json::json!({
        "protocol": wire.protocol,
        "temperature": wire.temperature,
        // `None` = 不发（见下面那段注释）；只有认得的几家要它（Claude 的接口必须给，Kimi 不给就很短）。
        "max_output_tokens": wire.max_output_tokens,
        "base_url": base_url,
        "api_key": api_key,
        "model": model,
        // 「思考力度」：空 = 什么都不发（用服务端默认），`off` = 明确关掉，其余原样发出去。
        // ⚠️ 不在这里校验取值 —— 合法取值文档里没有，端点才是权威，而它答一次不要钱。
        "reasoning_effort": if reasoning == "off" || reasoning.is_empty() { serde_json::Value::Null } else { serde_json::json!(reasoning) },
        "thinking_disabled": reasoning == "off",
        "system": system,
        "user": user,
        // ⚠️ 故意不发 `max_output_tokens`。2026-08-20 实测：V4-Flash 会思考,思考和正文
        // 共用同一个输出额度,按原文长度折算出来的那个「够用」的数字把正文整个掐掉了
        // ——回来的 `content` 是空字符串,界面上看起来像「接口不兼容」。
        // 猜一个更大的又会被服务端顶回来。所以不猜:让服务端用它自己的上限。
        // 子进程自己也要有超时，否则它可能比我们活得久。
        // 比外层短一点，好让它有机会把一个说人话的 timeout 信封写出来，
        // 而不是被我们杀掉之后只剩「进程没了」。
        "timeout_secs": timeout_secs.saturating_sub(5).max(10),
    })
}

/// 起子进程、喂 stdin、收信封。
///
/// 拆出来是为了**能被验证**：这一段（找到二进制、起进程、把 key 从 stdin 递进去、
/// 拿回一个分类过的信封）是形态 C 的全部机械部分,而它不需要任何 Tauri 类型。
/// 下面 `the_whole_chain_answers`（`--ignored`,要联网）跑的就是它。
fn spawn_sidecar(bin: &std::path::Path, payload: Vec<u8>, timeout_secs: u64) -> CompressOutcome {
    spawn_sidecar_with(bin, payload, timeout_secs, None)
}

/// 进度事件的名字。前端 `listen` 它。
pub const PROGRESS_EVENT: &str = "compress://progress";

fn spawn_sidecar_with(
    bin: &std::path::Path,
    payload: Vec<u8>,
    timeout_secs: u64,
    app: Option<tauri::AppHandle>,
) -> CompressOutcome {
    let mut cmd = Command::new(bin);
    cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    // 环境清空：这个子进程要的东西全部从 stdin 进来。清掉也顺便保证它读不到
    // 用户环境里可能存在的别的家 API key。
    cmd.env_clear();
    #[cfg(unix)]
    {
        // 自成进程组，取消/超时能把它整棵带走——和 engine.rs 同一个做法。
        use std::os::unix::process::CommandExt;
        unsafe {
            cmd.pre_exec(|| {
                if libc::setpgid(0, 0) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                Ok(())
            });
        }
    }
    // ⚠️ 每次起子进程之前清一次 —— 上一次的取消不能算在这一次头上。
    CANCELLED.store(false, Ordering::SeqCst);
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return CompressOutcome::failed("no_sidecar", format!("could not start {bin:?} — {e}"), None)
        }
    };
    let mut stdin = child.stdin.take();
    let mut stdout = child.stdout.take();
    let mut stderr = child.stderr.take();

    if let Some(s) = stdin.as_mut() {
        // 写完就关，子进程读到 EOF 才会开始干活。
        let _ = s.write_all(&payload);
    }
    drop(stdin);
    // payload 里有 key。
    drop(payload);

    // 两个读线程：stdout 是信封，stderr 只在「连信封都产不出来」时才有东西。
    // 分开读是因为任何一个管道写满都会把子进程卡死。
    let out_h = std::thread::spawn(move || {
        let mut buf = String::new();
        if let Some(s) = stdout.as_mut() {
            let _ = s.read_to_string(&mut buf);
        }
        buf
    });
    // ⚠️ stderr 是**逐行**读的，不是等进程结束再一把读完。
    //
    // 2026-08-20 Ocean 报的那条：「压缩时根本不会给反馈，用户不知道有没有连接成功」。
    // 这条路是不流式的，一个会思考的模型可以一分钟不吭声，界面上只有一个转圈——
    // 分不出「还在等」和「根本没连上」。子进程现在会在发出请求、开始收结果时各写一行，
    // 这个线程把它们即时转成事件送到界面。
    let err_h = std::thread::spawn(move || {
        let mut buf = String::new();
        let Some(s) = stderr.take() else { return buf };
        let reader = std::io::BufReader::new(s);
        for line in std::io::BufRead::lines(reader) {
            let Ok(line) = line else { break };
            // 进度行是一个对象（阶段 + 已思考多少字 + 已写多少字），整块转发给界面。
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                if v.get("stage").is_some() {
                    if let Some(app) = app.as_ref() {
                        use tauri::Emitter;
                        let _ = app.emit(PROGRESS_EVENT, v);
                    }
                    continue;
                }
            }
            // 不是进度行——那就是真的出事了，留着当报错详情。
            buf.push_str(&line);
            buf.push('\n');
        }
        buf
    });

    let handle = Arc::new(Mutex::new(Some(child)));
    *CHILD.lock().unwrap() = Some(handle.clone());
    let timed_out = wait_or_kill(&handle, Duration::from_secs(timeout_secs));
    let stdout = out_h.join().unwrap_or_default();
    let stderr = err_h.join().unwrap_or_default();

    // ⛔ **这一条必须排在「stdout 是空的」前面。** 取消之后 stdout 本来就是空的，
    // 排在后面就永远走不到 —— 那正是「按停下 → 叫我重装 Spool」的成因。
    if CANCELLED.swap(false, Ordering::SeqCst) {
        return CompressOutcome::failed("cancelled", "stopped by the user".into(), None);
    }
    if timed_out {
        return CompressOutcome::failed(
            "timeout",
            format!("The sidecar did not answer within {timeout_secs} seconds and was stopped."),
            None,
        );
    }
    if stdout.trim().is_empty() {
        // 子进程死在了产出信封之前。stderr 里没有 key（子进程从不回显请求）。
        let detail = if stderr.trim().is_empty() { "no output".into() } else { stderr.trim().to_string() };
        return CompressOutcome::failed("no_sidecar", format!("The sidecar said nothing — {detail}"), None);
    }
    parse_envelope(&stdout)
}

/// 轮询等待，因为 `Child::wait` 拿不到超时，而取消要能从另一个线程插进来。
/// 返回 true = 是我们把它杀掉的。
fn wait_or_kill(handle: &Arc<Mutex<Option<Child>>>, timeout: Duration) -> bool {
    let deadline = std::time::Instant::now() + timeout;
    loop {
        {
            let mut guard = handle.lock().unwrap();
            let Some(child) = guard.as_mut() else {
                // 被 cancel 拿走并杀掉了。
                return false;
            };
            match child.try_wait() {
                Ok(Some(_)) => return false,
                Ok(None) => {}
                Err(_) => return false,
            }
        }
        if std::time::Instant::now() >= deadline {
            let mut guard = handle.lock().unwrap();
            if let Some(child) = guard.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}

fn parse_envelope(stdout: &str) -> CompressOutcome {
    let line = stdout.trim();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
        return CompressOutcome::failed(
            "bad_response",
            format!("The sidecar's answer was not JSON: {}", clip(line)),
            None,
        );
    };
    if v.get("ok").and_then(|b| b.as_bool()) != Some(true) {
        return CompressOutcome::failed(
            v.get("kind").and_then(|s| s.as_str()).unwrap_or("http"),
            v.get("message").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            v.get("status").and_then(|n| n.as_u64()).map(|n| n as u16),
        );
    }
    let raw = v.get("text").and_then(|s| s.as_str()).unwrap_or("");
    let (text, cuts) = split_cuts(raw);
    let usage = v.get("usage");
    let n = |k: &str| usage.and_then(|u| u.get(k)).and_then(|x| x.as_u64());
    CompressOutcome {
        ok: true,
        text,
        cuts,
        kind: None,
        message: None,
        status: None,
        input_tokens: n("input_tokens").unwrap_or(0),
        output_tokens: n("output_tokens").unwrap_or(0),
        cached_input_tokens: n("cached_input_tokens"),
        reasoning_tokens: n("reasoning_tokens"),
        ms: v.get("ms").and_then(|x| x.as_u64()).unwrap_or(0) as u128,
        model: v.get("model").and_then(|s| s.as_str()).map(|s| s.to_string()),
    }
}

fn clip(s: &str) -> String {
    if s.chars().count() <= 300 {
        return s.to_string();
    }
    format!("{}…", s.chars().take(300).collect::<String>())
}

/// 取消。和 `engine.rs::request_cancel` 一样：没在跑也算成功——用户按的是一个已经结束的东西。
#[tauri::command]
pub fn compress_cancel() -> bool {
    // P9U-1: a 压缩 / 过期检测 on the CLI road is an engine run — stop it there (its result then comes
    // back as `cancelled`, see `ask_cli`). ⚠️ Only when THIS run is the CLI one: an unrelated engine run
    // (a follow-up) may be going at the same time as an API 压缩, and Stop here must not end it.
    if CLI_RUN.load(Ordering::SeqCst) {
        return crate::engine::request_cancel();
    }
    let guard = CHILD.lock().unwrap();
    let Some(handle) = guard.as_ref() else { return false };
    let mut child = handle.lock().unwrap();
    let Some(c) = child.as_mut() else { return false };
    // ⚠️ **先立旗再动手。** 杀掉之后那个正在等的线程随时会醒过来去看这个标志 ——
    // 顺序反过来就有一条缝，缝里它仍然会把「用户按了停下」诊断成「装坏了」。
    CANCELLED.store(true, Ordering::SeqCst);
    let _ = c.kill();
    let _ = c.wait();
    *child = None;
    true
}

/// 设置页要能说「找到了 / 没找到」，而不是等到用户点了压缩才报错。
#[tauri::command]
pub fn compress_sidecar_present() -> bool {
    sidecar_path().is_ok()
}

// ---------------------------------------------------------------------------------------
// D-a · 重复度探针（2026-08-22，Ocean）
// ---------------------------------------------------------------------------------------
//
// 实测四轮之后最要紧的一条：**压多少主要取决于这个项目里有多少重复，不取决于你选哪一档。**
// （同一组设置换个项目差 33 个百分点；三个档位在同一个项目上的中位数统计上分不开。）
// 那句话原来只是写在界面上的一行提示 —— 它是对的，但它把一个没解决的问题丢给了用户：
// **他没法在花钱之前知道自己这个项目有没有重复。**
//
// 这个探针就是那句提示的解药：**压之前先在本地算一遍。** 只读、纯本地、不出网、不花钱。
//
// ⚠️⚠️ **走的是 `find_similar_blocks` 那一套**（字符三元组 Jaccard ≥ 0.6）。
// ⛔ **绝不另立第二套口径**：用户在界面上看到的「有几组重复」和别的 AI 通过 MCP 看到的
// 必须是同一个数。两套口径各自都对、各自都能自洽，唯一的症状是两边开始悄悄说不一样的话。

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateProbe {
    /// 近重复的组数。
    pub groups: u64,
    /// 这些组里**可以并掉**的块数（每组保留一块）—— 用户要的是这个数，不是组数。
    pub extra_blocks: u64,
    /// 真的看过多少块。⚠️ 撞上 `SIMILAR_SCAN_CAP` 的时候老块没被看过。
    pub scanned_blocks: u64,
}

fn probe_from(v: &serde_json::Value) -> DuplicateProbe {
    let extra_blocks = v["groups"].as_array().map_or(0, |gs| {
        gs.iter()
            .map(|g| g["blocks"].as_array().map_or(0, |b| b.len().saturating_sub(1)) as u64)
            .sum()
    });
    DuplicateProbe {
        groups: v["total_groups"].as_u64().unwrap_or(0),
        extra_blocks,
        scanned_blocks: v["scanned_blocks"].as_u64().unwrap_or(0),
    }
}

/// 这个项目里有多少重复。⚠️ 算不出来就返回 Err —— 界面于是**不显示这一行**，⛔ 不编一个数。
// ⚠️ `(async)`：开库 + 一趟近重复扫描（`busy_timeout` 自己就有 2 秒），⛔ 不能占主线程。
#[tauri::command(async)]
pub fn compress_duplicate_probe(thread_id: String) -> Result<DuplicateProbe, String> {
    let dir = crate::mcp::app_data_dir().ok_or_else(|| "no app data dir".to_string())?;
    // P9E: the user's own number, shown to them — the whole library, private projects too.
    let conn = crate::mcp::open_db_whole(&dir)?;
    let raw = crate::mcp::find_similar_blocks_json(&conn, Some(&thread_id), None, Some(30))?;
    let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(probe_from(&v))
}

/// P2 · B4：「复制到…」之前，这几块在目标项目里有没有相同 / 相似的。
/// ⚠️ 判断全在 `mcp::forward_duplicates`（和上面这个探针同一把尺子），这里只开库。
// ⚠️ `(async)`：开库 + 一趟比对，⛔ 不占主线程。
#[tauri::command(async)]
pub fn forward_duplicate_check(
    target_thread_id: String,
    block_ids: Vec<String>,
) -> Result<Vec<crate::mcp::ForwardDuplicate>, String> {
    let dir = crate::mcp::app_data_dir().ok_or_else(|| "no app data dir".to_string())?;
    // P9E: the user moving blocks — into a private project too — checks the whole library
    // (`open_db` is what an AI sees, and would find nothing there to compare against).
    let conn = crate::mcp::open_db_whole(&dir)?;
    crate::mcp::forward_duplicates(&conn, &target_thread_id, &block_ids)
}

// ---------------------------------------------------------------------------------------
// API key 存哪儿
//
// ⛔ **不存 settings.json，这一条是硬的。** 两个理由，任何一个单独都成立：
//
// 1. 这个仓库已经就同一件事做过判断了。`settingsStore.ts` 里的 `LEGACY_AI_KEYS` 会在每次
//    启动时**主动擦掉** settings.json 里遗留的 `groqKey` / `geminiKey`，注释原话是
//    「plaintext API keys and must not linger on disk once nothing reads them」。现在再往
//    同一个文件里塞一个明文 key，等于把当初专门清掉的东西请回来。
// 2. settings.json 是**会跟着人走**的：`breakReminder.ts` 里写着它「hand-editable and
//    travels between builds (DESIGN_LIBRARY_TRANSFER)」。一个会被导出、被拷到另一台机器、
//    被贴进 issue 的文件，不该装着一把能花钱的钥匙。
//
// ⭐⭐ **2026-08-23：挪进系统钥匙串了**（E3 的前置，Ocean 在三档里选的 `security-framework`）。
//
// 在此之前是「app_config_dir 下一个 0600 的文件」——那是个**够用的临时方案**，当时的目的是
// 先让 Ocean 看见压缩质量。它挡得住「settings.json 被拷走」，⛔ **挡不住「同一个账号下的
// 别的程序去读它」**：0600 防的是别的用户，而在一台个人电脑上，威胁本来就在同一个账号里。
//
// ⚠️ **`security-framework` 不碰网络**，所以 §4.2 那条护栏（主进程不发网络请求，外人能当场验）
// 仍然成立。⛔ 每次动 `Cargo.toml` 都要再跑一次：
//   cargo tree -e normal | grep -iE "ureq|rustls|reqwest|hyper|openssl"   # 必须是空的
//
// ⛔ **只有 macOS 走钥匙串。** Windows 继续用 0600 文件（那边还没签名，不是当前战场），
// 换跨平台的 `keyring` 会把 dbus/secret-service 拖进依赖树 —— 那一档被明确否了。

/// 钥匙串里那一条的名字。⚠️ 两个都别改：改了等于用户的 key 凭空消失，
/// 而钥匙串里还躺着一条谁也读不到的旧记录。
#[cfg(target_os = "macos")]
const KEYCHAIN_SERVICE: &str = "com.oceanjin.spool";
#[cfg(target_os = "macos")]
const KEYCHAIN_ACCOUNT: &str = "api-key";

fn key_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = tauri::Manager::path(app).app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("api-key"))
}

/// 老地方那个 0600 文件里还有没有 key。⚠️ 只在 macOS 上用来做一次性搬家。
fn legacy_file_key(app: &tauri::AppHandle) -> Option<String> {
    let path = key_path(app).ok()?;
    let key = std::fs::read_to_string(&path).ok()?.trim().to_string();
    if key.is_empty() { None } else { Some(key) }
}

#[cfg(target_os = "macos")]
mod keychain {
    use super::{KEYCHAIN_ACCOUNT, KEYCHAIN_SERVICE};
    use security_framework::passwords as pw;

    pub fn save(key: &str) -> Result<(), String> {
        pw::set_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, key.as_bytes())
            .map_err(|e| e.to_string())
    }

    pub fn load() -> Option<String> {
        // ⚠️ 读不到有两种：没存过，和用户在钥匙串弹窗上点了「不允许」。
        // 两种都当成「没有」——⛔ 不在这儿弹二次提示，界面上那句「你还没填 key」已经够了。
        let bytes = pw::get_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).ok()?;
        let s = String::from_utf8(bytes).ok()?.trim().to_string();
        if s.is_empty() { None } else { Some(s) }
    }

    pub fn delete() {
        let _ = pw::delete_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    }
}

/// 一次性搬家：老地方那个文件里有 key、而钥匙串里没有 → 搬进去，然后**删掉文件**。
///
/// ⚠️ **删文件是这件事的重点**，不是收尾：留着的话，挪进钥匙串就只是多了一份拷贝，
/// 原来那份仍然躺在磁盘上任人读 —— 那等于什么都没做。
/// ⛔ 写钥匙串失败就**不删**：宁可两份都在，也不能把用户唯一那把钥匙弄丢。
#[cfg(target_os = "macos")]
fn migrate_key_into_keychain(app: &tauri::AppHandle) {
    if keychain::load().is_some() {
        // 钥匙串里已经有了 —— 老文件如果还在，它是搬家没删干净的残留，清掉。
        if let Ok(path) = key_path(app) {
            let _ = std::fs::remove_file(path);
        }
        return;
    }
    let Some(key) = legacy_file_key(app) else { return };
    if keychain::save(&key).is_ok() {
        if let Ok(path) = key_path(app) {
            let _ = std::fs::remove_file(path);
        }
    }
}

// ⚠️⚠️ `(async)`（2026-08-27，查「键盘假死三十秒」查到这儿）：这三条**都要读钥匙串**
// （`SecItemCopyMatching`），而钥匙串是会长时间阻塞的 —— 同一个二进制重新签过之后系统要重新
// 验一次签，实测 **60–75 秒**；屏幕锁着的时候那个授权框弹不出来，于是**无限期**卡住
// （两个数都在记忆 `isolated-verify-workflow` §35 里，是这个仓库自己量过的）。
// 不带 `(async)` 的命令是在 IPC 回调里就地跑的，而 macOS 上那个回调派发在主线程 ⇒
// 卡多久，整个窗口就冻多久，键盘一个字也进不去，而别的 app 一切正常。
// ⛔ 别把这三条改回同步。理由和 `ai_engine_status` / `probe_browser_automation` 是同一条。
#[tauri::command(async)]
pub fn api_key_save(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let key = key.trim();
    #[cfg(target_os = "macos")]
    {
        // 清空 = 从钥匙串里删掉那一条，不是存一个空串。
        if key.is_empty() {
            keychain::delete();
        } else {
            keychain::save(key)?;
        }
        // 老文件不该再存在。⚠️ 用户可能是从一个没走过搬家那一步的旧版本升上来的。
        if let Ok(path) = key_path(&app) {
            let _ = std::fs::remove_file(path);
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let path = key_path(&app)?;
        if key.is_empty() {
            // 清空 = 删掉文件，不是写一个空文件。
            let _ = std::fs::remove_file(&path);
            return Ok(());
        }
        std::fs::write(&path, key).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            // 0600。⚠️ 写完再改权限有一个短暂的窗口，但 app_config_dir 本身就是 0700，
            // 同一个账号之外的人进不来。
            let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }
}

/// 读 key —— **钥匙串优先，读不到再回落到老那个 0600 文件**。
///
/// ⭐⭐ **拆出来不需要 `AppHandle`，是为了让实测台和产品读的是同一把钥匙。**
/// ⚠️⚠️ 2026-08-23 装机的时候当场撞到的：实测台原来直接读
/// `app_data_dir()/api-key`，而 key 挪进钥匙串那一步会**把那个文件删掉** ——
/// 于是「Ocean 打开一次设置页」和「连夜实测还跑不跑得起来」被绑在了一起，
/// ⛔ 而且失败会发生在他睡着以后。
///
/// ⚠️ macOS 上 `app_config_dir()` 和 `app_data_dir()` 都是
/// `~/Library/Application Support/<identifier>`，所以两边指的是同一个文件。
pub(crate) fn read_api_key() -> String {
    #[cfg(target_os = "macos")]
    if let Some(k) = keychain::load() {
        return k;
    }
    let Some(dir) = crate::mcp::app_data_dir() else {
        return String::new();
    };
    std::fs::read_to_string(dir.join("api-key")).unwrap_or_default().trim().to_string()
}

#[tauri::command(async)]
pub fn api_key_load(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        migrate_key_into_keychain(&app);
        // ⚠️ 走 `read_api_key()`（钥匙串优先、回落到文件）而不是只读钥匙串：
        // 万一钥匙串那一下写失败了，老文件是**故意没删**的，产品照样该能用。
        Ok(read_api_key())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let path = key_path(&app)?;
        Ok(std::fs::read_to_string(&path).unwrap_or_default().trim().to_string())
    }
}

/// 设置页只想知道「填没填」，不需要把 key 拿到前端去。
///
/// ⚠️ macOS 上这一条**会读一次钥匙串**（`SecItemCopyMatching`）。同一个签名身份下
/// 不弹窗；⛔ 换了签名身份（比如从公证版换成 dev build）系统会当成另一个程序来问，
/// 那一次会弹一个「允许访问钥匙串」的框 —— 那是对的，不是 bug。
#[tauri::command(async)]
pub fn api_key_present(app: tauri::AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        migrate_key_into_keychain(&app);
        keychain::load().is_some()
    }
    #[cfg(not(target_os = "macos"))]
    {
        key_path(&app).map(|p| p.is_file()).unwrap_or(false)
    }
}

// ---------------------------------------------------------------------------------------
// 第二轮实测台的入口（WORKPLAN §9.6.3）。⚠️ `#[cfg(test)]` —— 发布构建里没有这两个函数。
//
// 存在的理由只有一条：**实测量的必须是产品本身**。所以实测台不自己找二进制、不自己拼请求、
// 不自己起进程 —— 它借的就是上面那三样（`sidecar_path` / `sidecar_request` / `spawn_sidecar`）。
// 哪天请求里多一个参数，实测跟着变；否则跑出来的数字描述的是那个脚本，不是 Spool。
// ---------------------------------------------------------------------------------------

#[cfg(test)]
pub(crate) fn sidecar_path_for_test() -> Result<std::path::PathBuf, String> {
    sidecar_path()
}

#[cfg(test)]
#[allow(clippy::too_many_arguments)]
pub(crate) fn compress_for_test(
    bin: &std::path::Path,
    base_url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
    reasoning: &str,
    timeout_secs: u64,
    // 🆕 第六轮阶段 2（T3）：**故意**给一个小到不够用的输出上限，把回复掐断。
    // `None` = 什么都不加，⭐ 也就是产品那条路，一个字节都不差。
    //
    // ⚠️⚠️ **为什么在这里加，而不是加进 `sidecar_request`**：那个函数是**和产品共用**的
    // （见它上面那段注释），改它的签名就等于改产品发出去的请求。而这里是 `#[cfg(test)]`，
    // 发布构建里根本没有这个函数 —— ⛔ 实测台要的这个旋钮，碰不到用户那条路。
    max_output_tokens: Option<u32>,
) -> CompressOutcome {
    let timeout_secs = clamp_timeout(timeout_secs);
    let mut request = sidecar_request(
        base_url,
        api_key,
        model,
        system,
        user,
        reasoning,
        &ApiWire::or_legacy(None),
        timeout_secs,
    );
    if let Some(cap) = max_output_tokens {
        request["max_output_tokens"] = serde_json::json!(cap);
    }
    let payload = match serde_json::to_vec(&request) {
        Ok(v) => v,
        Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
    };
    spawn_sidecar(bin, payload, timeout_secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- 余额（X 批，2026-08-26）----

    #[test]
    fn a_balance_envelope_keeps_the_amount_as_a_string() {
        // ⛔ 不许在任何一层折算成浮点：`"25.50"` 过一次 f64 就可能变成 25.499999。
        let b = parse_balance(r#"{"ok":true,"currency":"CNY","total":"25.50","usable":true}"#);
        assert!(b.ok);
        assert_eq!(b.total, "25.50");
        assert_eq!(b.currency, "CNY");
        assert!(b.usable);
    }

    #[test]
    fn an_endpoint_that_does_not_report_a_balance_is_not_an_error() {
        // ⭐ 「这家不报余额」和「查失败了」必须分得开 —— 界面上是两句不同的话，
        // ⛔ 而两者都不许显示成 0。
        let b = parse_balance(
            r#"{"ok":false,"kind":"unsupported","message":"no /user/balance","status":404}"#,
        );
        assert!(!b.ok);
        assert_eq!(b.kind.as_deref(), Some("unsupported"));
    }

    #[test]
    fn a_refused_key_is_reported_as_auth_not_as_a_missing_feature() {
        let b = parse_balance(r#"{"ok":false,"kind":"auth","message":"401","status":401}"#);
        assert_eq!(b.kind.as_deref(), Some("auth"));
    }

    #[test]
    fn garbage_from_the_balance_query_is_a_visible_failure() {
        let b = parse_balance("<html>gateway error</html>");
        assert!(!b.ok);
        assert_eq!(b.kind.as_deref(), Some("bad_response"));
        assert!(b.total.is_empty());
    }

    // P9U-3：厂商表算好的三样东西原样进请求；老的调用方（None）还是原来那条路。
    #[test]
    fn the_vendor_wire_goes_into_the_request() {
        let w = ApiWire { protocol: "anthropic".into(), temperature: None, max_output_tokens: Some(64_000) };
        let r = sidecar_request("https://api.anthropic.com", "k", "m", "s", "u", "low", &w, 60);
        assert_eq!(r["protocol"], "anthropic");
        assert!(r["temperature"].is_null());
        assert_eq!(r["max_output_tokens"], 64_000);
        assert_eq!(r["reasoning_effort"], "low");
        let legacy = sidecar_request("https://api.deepseek.com", "k", "m", "s", "u", "", &ApiWire::or_legacy(None), 60);
        assert_eq!(legacy["protocol"], "");
        assert_eq!(legacy["temperature"], 0.2);
        assert!(legacy["max_output_tokens"].is_null());
    }

    #[test]
    fn a_model_list_comes_through_and_a_refused_key_says_auth() {
        let ok = parse_models(r#"{"ok":true,"models":["a","b"]}"#);
        assert!(ok.ok);
        assert_eq!(ok.models, vec!["a", "b"]);
        let no = parse_models(r#"{"ok":false,"kind":"auth","message":"401","status":401}"#);
        assert_eq!(no.kind.as_deref(), Some("auth"));
        assert!(!parse_models("garbage").ok);
    }

    #[test]
    fn a_failure_envelope_keeps_the_kind_so_the_ui_can_say_which_one() {
        let o = parse_envelope(r#"{"ok":false,"kind":"quota","message":"out of balance","status":402}"#);
        assert!(!o.ok);
        assert_eq!(o.kind.as_deref(), Some("quota"));
        assert_eq!(o.status, Some(402));
    }

    // §6.2 约束 4：退回未压缩版而不告诉用户，是这个项目最怕的一类 bug。
    #[test]
    fn garbage_on_stdout_is_a_visible_failure_not_an_empty_success() {
        let o = parse_envelope("<html>gateway error</html>");
        assert!(!o.ok);
        assert_eq!(o.kind.as_deref(), Some("bad_response"));
    }

    #[test]
    fn a_success_envelope_carries_the_numbers_the_ledger_needs() {
        let o = parse_envelope(
            r#"{"ok":true,"text":"PACK","usage":{"input_tokens":30000,"output_tokens":2000,"cached_input_tokens":27000},"model":"deepseek-chat","ms":8123}"#,
        );
        assert!(o.ok);
        assert_eq!(o.input_tokens, 30000);
        assert_eq!(o.cached_input_tokens, Some(27000));
        assert_eq!(o.model.as_deref(), Some("deepseek-chat"));
    }

    // 「这家没报缓存命中」必须留成 None。显示成 0 就等于宣称一次都没命中，
    // 而第 5 步要拿这个数字去推翻或坐实 §6.2 的估算。
    #[test]
    fn an_endpoint_that_reports_no_cache_field_stays_unknown() {
        let o = parse_envelope(
            r#"{"ok":true,"text":"PACK","usage":{"input_tokens":100,"output_tokens":10},"model":"m","ms":1}"#,
        );
        assert_eq!(o.cached_input_tokens, None);
    }

    #[test]
    fn the_cuts_section_is_split_off_the_pack() {
        let o = parse_envelope(
            r##"{"ok":true,"text":"# Project Context\n\nbody\n⟦SPOOL:CUTS⟧\n- merged two repeats\n⟦/SPOOL:CUTS⟧","usage":{},"model":"m","ms":1}"##,
        );
        assert!(o.ok);
        assert!(!o.text.contains("SPOOL:CUTS"));
        assert!(o.text.ends_with("body"));
        assert_eq!(o.cuts.as_deref(), Some("- merged two repeats"));
    }

    // 模型没写那一段时，界面要能说「它没说自己删了什么」——所以这里必须是 None，
    // 不能编一句「无」出来。
    #[test]
    fn a_model_that_never_said_what_it_cut_leaves_cuts_unknown() {
        let (pack, cuts) = split_cuts("# Project Context\n\nbody");
        assert_eq!(pack, "# Project Context\n\nbody");
        assert_eq!(cuts, None);
    }

    // 整条链子：找到二进制 → 起进程 → 把请求(含 key)从 stdin 递进去 → 拿回分类过的信封。
    //
    // ⚠️ `--ignored`,因为它**真的会联网**（打到 api.deepseek.com），而这个项目的测试
    // 平时必须能离线跑完。跑法：
    //
    //     cargo test --lib the_whole_chain_answers -- --ignored --nocapture
    //
    // 用的是一个假 key,所以**不花钱**,期望结果就是 `auth`。这条能过就说明形态 C 的机械
    // 部分是通的;还没被证明的只剩一件事：**一次成功的压缩长什么样**——那个需要真 key。
    #[test]
    #[ignore = "reaches the network; run with --ignored"]
    fn the_whole_chain_answers() {
        let bin = sidecar_path().expect("build it first: cargo build --manifest-path src-tauri/sidecar/Cargo.toml");
        let payload = serde_json::to_vec(&serde_json::json!({
            "base_url": "https://api.deepseek.com",
            "api_key": "sk-deliberately-not-a-real-key",
            "model": "deepseek-chat",
            "system": "s",
            "user": "u",
            "timeout_secs": 30,
        }))
        .unwrap();
        let out = spawn_sidecar(&bin, payload, 60);
        println!("kind={:?} status={:?} message={:?}", out.kind, out.status, out.message);
        assert!(!out.ok);
        assert_eq!(out.kind.as_deref(), Some("auth"), "expected the endpoint to reject a bogus key");
        assert_eq!(out.status, Some(401));
    }

    // D-a：探针读的是 `find_similar_blocks` 的输出。⚠️ 用户要的是「能并掉几块」——
    // 每组保留一块，所以是 members - 1，不是 members。写成 members 界面上那个数会虚高。
    #[test]
    fn probe_counts_blocks_that_can_be_merged_away() {
        let v = serde_json::json!({
            "scanned_blocks": 45,
            "total_groups": 2,
            "groups": [
                { "blocks": [{}, {}, {}] },
                { "blocks": [{}, {}] },
            ],
        });
        assert_eq!(
            probe_from(&v),
            DuplicateProbe { groups: 2, extra_blocks: 3, scanned_blocks: 45 }
        );
    }

    #[test]
    fn probe_reads_zero_when_nothing_repeats() {
        let v = serde_json::json!({ "scanned_blocks": 12, "total_groups": 0, "groups": [] });
        assert_eq!(probe_from(&v).extra_blocks, 0);
    }

    #[test]
    fn timeouts_are_clamped_at_both_ends() {
        assert_eq!(clamp_timeout(1), 10);
        // ⚠️ 上限 2026-08-20 从 900 提到 1800（实测：26,615 字符那份 180 秒还没写完就被掐，
        // 而那一次已经计费）。这条断言当时忘了跟着改，直到 08-21 才发现。
        assert_eq!(clamp_timeout(99_999), 1800);
        assert_eq!(clamp_timeout(120), 120);
    }
}

// ---------------------------------------------------------------------------------------
// E3 · 作废检测接产品（COMPRESS-UX-R2-2026-08-22 §7 / WORKPLAN §2.E3）
// ---------------------------------------------------------------------------------------
//
// 60 次实测早就判定「可以接」，而产品里一行都没接 —— 提示词只活在 `compress_sweep.rs`，
// 那个模块是 `#[cfg(test)]` 的。这一段是它进出货路径的那条命令。
//
// ⚠️⚠️ **这里最要紧的不是发请求，是回来之后那道闸。**
//
// 模型报的每一条都带两句引文（旧块里证明它作废的那一句、新块里取代它的那一句），
// 提示词第 2 条明写「必须逐字连续出现，Spool 会拿它们回去精确比对，对不上的整条丢掉」。
// ⛔ **那句话必须是真的**：一条引文对不上的提议，意味着模型在**指一句它自己编的话**，
// 而用户要凭这句话决定退不退一个块。
//
// 折叠规则和第四轮那个 `gate.py` 逐字同源（§6.1 口径 1）：
//   * 只折叠**标点**的全角/半角，⛔ **数字和日期一个都不折叠**；
//   * 折叠表每一项都是**单字符对单字符**，所以折叠不改变长度 ——
//     于是「有没有因为折叠放进本该被拒的」是可逐字打印的清单，不是一句保证；
//   * `…` **故意不在表里**：提示词明写「不许用省略号」，所以它是破规矩，不是重打。

/// 全角 → 半角，**只有标点**。⛔ 数字一个都不在这儿：全角 ０-９ 故意不折叠，
/// 重打成半角数字必须报出来。⚠️ 每一项都必须是单字符对单字符（长度守恒）。
fn fold_char(c: char) -> char {
    match c {
        '，' | '、' => ',',
        '。' | '．' => '.',
        '；' => ';',
        '：' => ':',
        '！' => '!',
        '？' => '?',
        '（' => '(',
        '）' => ')',
        '《' => '<',
        '》' => '>',
        '【' => '[',
        '】' => ']',
        '“' | '”' | '「' | '」' | '『' | '』' => '"',
        '‘' | '’' => '\'',
        '—' | '–' | '－' | '﹣' | '‐' => '-',
        '／' => '/',
        '＼' => '\\',
        '｜' => '|',
        '～' => '~',
        '％' => '%',
        '＃' => '#',
        '＆' => '&',
        '＊' => '*',
        '＋' => '+',
        '＝' => '=',
        '＄' => '$',
        '　' => ' ',
        other => other,
    }
}

fn fold(s: &str) -> Vec<char> {
    s.chars().map(fold_char).collect()
}

/// ⭐ T4(2026-08-23,第五轮实测)——**引文只有一把尺子。**
///
/// 存进库的 `corrected_quote` 是过了上面那道闸的,而闸**折叠标点**才放行;
/// 渲染那一侧原来用的是 `content.contains(quote)`,**不折叠**。
/// ⛔ 平常不咬人,但「先接受一条更正、之后再压缩这个项目」会咬:压缩顺手把全角标点
/// 换成半角(实测那一份换掉 46%),R1 之后压缩稿写回 `content` —— 于是那句引文从此
/// 对不上,**pack 里那行「更正了哪一句」退回只报块号,而且不报任何错**。
///
/// ⚠️ 和 TS 那边 `lib/blocks/quoteFold.ts` 是同一条规则,两边各写一遍(和表头双份同一类)。
pub(crate) fn quote_is_in_block(content: &str, quote: &str) -> bool {
    if quote.is_empty() {
        return false;
    }
    if content.contains(quote) {
        return true;
    }
    let (fc, fq) = (fold(content), fold(quote));
    !fq.is_empty() && fq.len() <= fc.len() && fc.windows(fq.len()).any(|w| w == fq.as_slice())
}

/// 一句引文在一块里的下落。⚠️ 只有 `Verbatim` 和 `Retyped` 能留下来。
#[derive(PartialEq, Debug)]
enum Quoted {
    /// 一字不差。
    Verbatim,
    /// 只差标点（每一处都在折叠表里，⛔ 两边都不是数字）。破了「逐字」，但没改内容。
    Retyped,
    /// ⛔ 折叠后能对上，但**有一处动的是数字** —— 整条丢掉。
    Digits,
    /// ⛔ 折叠后仍然对不上，或者块里根本没有 —— 整条丢掉。
    Absent,
}

fn locate(quote: &str, block: &str) -> Quoted {
    if quote.is_empty() {
        return Quoted::Absent;
    }
    if block.contains(quote) {
        return Quoted::Verbatim;
    }
    let fb = fold(block);
    let fq = fold(quote);
    if fq.is_empty() || fq.len() > fb.len() {
        return Quoted::Absent;
    }
    let Some(at) = fb.windows(fq.len()).position(|w| w == fq.as_slice()) else {
        return Quoted::Absent;
    };
    // 回到**原文**取同样长度的一段，逐字符比 —— 折叠长度守恒，所以这一步对得齐。
    let raw: Vec<char> = block.chars().skip(at).take(fq.len()).collect();
    for (a, b) in quote.chars().zip(raw.iter().copied()) {
        if a == b {
            continue;
        }
        if a.is_ascii_digit() || b.is_ascii_digit() || a.is_numeric() || b.is_numeric() {
            return Quoted::Digits;
        }
        if fold_char(a) != fold_char(b) {
            return Quoted::Absent;
        }
    }
    Quoted::Retyped
}

/// 把一份 pack 按块首行切开 → `编号 → 那一块全文`。
/// ⚠️ 和 `compress.ts::ENTRY_RE`、`gate.py::blocks_of` 同一条规则。
fn blocks_of(pack: &str) -> std::collections::HashMap<i64, String> {
    let mut out: std::collections::HashMap<i64, String> = std::collections::HashMap::new();
    let mut cur: Option<i64> = None;
    let mut buf: Vec<&str> = Vec::new();
    for line in pack.lines() {
        let head = crate::mcp::entry_seq(line);
        if let Some(seq) = head {
            if let Some(c) = cur {
                out.entry(c).or_insert_with(|| buf.join("\n"));
            }
            cur = Some(seq);
            buf = vec![line];
        } else if cur.is_some() {
            buf.push(line);
        }
    }
    if let Some(c) = cur {
        out.entry(c).or_insert_with(|| buf.join("\n"));
    }
    out
}

/// 一条提议。⚠️ 编号是**块自己的 `#N`**，不是它在 pack 里排第几。
#[derive(serde::Serialize, Clone, Debug)]
pub struct StaleProposal {
    pub stale_seq: i64,
    pub by_seq: i64,
    pub why: String,
    pub quote_stale: String,
    pub quote_new: String,
    /// `true` = 两句引文里至少有一句是「只差标点的重打」。
    /// ⚠️ **界面要说出来**：它确实破了「逐字」，只是没改内容。
    pub retyped: bool,
}

/// ⛔ 没过闸、被整条丢掉的那一条 —— **连它说了什么一起交出去**。
///
/// ⚠️⚠️ **2026-08-23（Ocean 真手指验收第 8 条）：原来这里只回一个数。**
/// 界面于是只能写「另有 1 条被丢掉了 —— 它给的引文在块里对不上，Spool 不拿它给你看」，
/// 而他读到的是「我的项目有问题，但 Spool 不告诉我是哪儿」。他的原话：
/// **「不允许这样的情况发生。」**
///
/// ⭐ 病根不在措辞，在**这个结构里根本没有可给的东西**：丢掉的那几条连内容都没带回来。
/// 所以整条带回来 —— 它没过闸不是「不能看」，是**不能当成事实去动库**。
/// ⚠️ 界面上要摆得很清楚：这几条是**AI 自己没说对**，⛔ 不是用户的项目出了问题。
#[derive(serde::Serialize, Clone, Debug)]
pub struct StaleDropped {
    /// 它说的旧块编号。⚠️ 可能根本不是这份 pack 里的编号，甚至可能没说 —— 那时候是 `null`。
    pub stale_seq: Option<i64>,
    pub by_seq: Option<i64>,
    pub why: String,
    pub quote_stale: String,
    pub quote_new: String,
    /// 为什么没过闸。⚠️ 界面按它挑话说，⛔ 别在界面里另判一遍。
    /// `no_seq` 没说是哪两块 · `no_block` 编号不在这份 pack 里 · `same_block` 指到了自己 ·
    /// `quote_stale` / `quote_new` 那一句在块里找不到。
    pub reason: &'static str,
}

#[derive(serde::Serialize)]
pub struct StaleScan {
    /// 请求本身的信封（成功没成功、花了多少、多久）。和压缩那条路共用一套。
    pub outcome: CompressOutcome,
    /// ⚠️ **过了闸的**才在这儿。
    pub proposals: Vec<StaleProposal>,
    /// ⛔ 引文对不上、被整条丢掉的那几条。⚠️ **必须报出来**：模型提了 5 条只留下 2 条
    /// 和它本来就只提了 2 条，是两件完全不同的事。⭐ 而且要带上它到底说了什么。
    pub dropped: Vec<StaleDropped>,
}

/// 从模型那一坨输出里把 JSON 数组抠出来。⚠️ 提示词说了不要代码块标记，
/// 但一个只在「它守规矩时」才work的解析器，等于把守规矩当成了前提。
fn json_array_slice(text: &str) -> &str {
    let t = text.trim();
    match (t.find('['), t.rfind(']')) {
        (Some(a), Some(b)) if b > a => &t[a..=b],
        _ => "[]",
    }
}

/// 逐条过闸。⛔ 一条引文对不上就整条丢掉 —— 提示词里那句承诺必须是真的。
///
/// ⚠️ 丢掉的那几条**连内容一起带出去**（`StaleDropped`）：闸挡住的是「拿它去动库」，
/// ⛔ 不是「不让用户知道 AI 说过什么」。见 `StaleDropped` 上面那段。
fn gate_proposals(raw: &str, pack: &str) -> (Vec<StaleProposal>, Vec<StaleDropped>) {
    let blocks = blocks_of(pack);
    let parsed: Vec<serde_json::Value> =
        serde_json::from_str(json_array_slice(raw)).unwrap_or_default();
    let mut kept = Vec::new();
    let mut dropped: Vec<StaleDropped> = Vec::new();
    for item in parsed {
        let stale_seq = item.get("stale").and_then(serde_json::Value::as_i64);
        let by_seq = item.get("by").and_then(serde_json::Value::as_i64);
        let str_of = |k: &str| {
            item.get(k).and_then(serde_json::Value::as_str).unwrap_or_default().to_string()
        };
        // ⛔⛔ **引文一个字符都不许动**（首尾空白也算）：这道闸的全部意义是「它引的那句话
        // 逐字出现在那一块里」，而 `locate` 认的就是这个字符串。⚠️ 顺手 `.trim()` 一下
        // 会把闸放宽一点点，而且**放宽之后测试照样是绿的** —— 只有 `why` 是给人读的，
        // 它才 trim（原来就是这样，⛔ 别把两者调换）。
        let why = str_of("why").trim().to_string();
        let (qs, qn) = (str_of("quote_stale"), str_of("quote_new"));
        let drop = |reason: &'static str| StaleDropped {
            stale_seq,
            by_seq,
            why: why.clone(),
            quote_stale: qs.clone(),
            quote_new: qn.clone(),
            reason,
        };
        let (Some(stale_seq), Some(by_seq)) = (stale_seq, by_seq) else {
            dropped.push(drop("no_seq"));
            continue;
        };
        if stale_seq == by_seq {
            dropped.push(drop("same_block"));
            continue;
        }
        // ⛔ 指到 pack 里没有的编号 —— 整条丢掉。
        let (Some(old), Some(new)) = (blocks.get(&stale_seq), blocks.get(&by_seq)) else {
            dropped.push(drop("no_block"));
            continue;
        };
        let (a, b) = (locate(&qs, old), locate(&qn, new));
        let ok = |q: &Quoted| matches!(q, Quoted::Verbatim | Quoted::Retyped);
        if !ok(&a) {
            dropped.push(drop("quote_stale"));
            continue;
        }
        if !ok(&b) {
            dropped.push(drop("quote_new"));
            continue;
        }
        kept.push(StaleProposal {
            stale_seq,
            by_seq,
            why,
            quote_stale: qs,
            quote_new: qn,
            retyped: a == Quoted::Retyped || b == Quoted::Retyped,
        });
    }
    (kept, dropped)
}

/// ⭐ S2(2026-08-24)——MCP 那一侧提「整条取代」时走的**同一道闸**。
///
/// ⛔⛔ **这是一个转发，不是第二份实现。** 它调的就是 `locate` ——E3 花钱扫那一遍
/// 用的那一个。§2.S2 写死了:「界面上放行的和 Rust 放行的必须是同一批」,
/// 抄一份出来,两条路就会在某一次改动之后悄悄分叉,而分叉的那一天没有任何症状。
///
/// `Some(retyped)` = 放行(`retyped` = 只差标点的重打,界面要说出来);
/// `None` = 整条丢掉(引文对不上,或者**动的是数字**)。
///
/// ⚠️⚠️ **输入一个字符都不许动,首尾空白也算** —— 顺手 `.trim()` 一下会把闸放宽一点点,
/// 而且**放宽之后测试照样是绿的**。
pub(crate) fn quote_passes(quote: &str, block: &str) -> Option<bool> {
    match locate(quote, block) {
        Quoted::Verbatim => Some(false),
        Quoted::Retyped => Some(true),
        Quoted::Digits | Quoted::Absent => None,
    }
}

/// 实测台用的口子：⛔ 只是把 `gate_proposals` 原样露出来，**不是另一份实现**。
/// 阶段 4 的复算必须过产品这一道闸，抄一份出来量到的就不是产品了。
#[cfg(test)]
pub(crate) fn gate_proposals_for_test(raw: &str, pack: &str) -> (Vec<StaleProposal>, Vec<StaleDropped>) {
    gate_proposals(raw, pack)
}

/// 查一遍这份 pack 里有没有被后面的块整条取代的旧块。
///
/// ⚠️ 和压缩共用同一把「正在跑」的锁：两件事都要起 `spool-ai`，而这台机器上同时跑两个
/// 只会让两边都变慢，还把「这一次花了多少」搅在一起。
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn stale_scan_via_api(
    app: tauri::AppHandle,
    pack_text: String,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<StaleScan, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let pack_for_gate = pack_text.clone();
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        let (system, user) = crate::mcp::stale_messages_for_api(&pack_text);
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return CompressOutcome::failed("no_sidecar", e, None),
        };
        let timeout_secs = clamp_timeout(timeout_secs);
        let request =
            sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, &wire, timeout_secs);
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
        };
        spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()))
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    let outcome = match out {
        Ok(o) => o,
        Err(e) => CompressOutcome::failed("internal", e.to_string(), None),
    };
    let (proposals, dropped) = if outcome.ok {
        gate_proposals(&outcome.text, &pack_for_gate)
    } else {
        (Vec::new(), Vec::new())
    };
    Ok(StaleScan { outcome, proposals, dropped })
}

// ---------------------------------------------------------------------------------------
// P9V-1 · 一整个工作区一起查（Ocean 10-24 第 192、196 条）
// ---------------------------------------------------------------------------------------
//
// ⚠️ 进来的是**各项目分开的** pack（顺序 = 提示词里的 P1、P2……，`mcp::stale_ws_messages_for_api`），
// 闸在每个项目自己的 pack 里拆块、找引文 —— ⛔ 不从拼起来的那份材料里倒着拆：`#3` 在三个项目里
// 各有一个，拼起来之后 `blocks_of` 只会留下第一个。
// ⛔ 引文那一道和「只查这个项目」是**同一个** `locate`，规矩一个字不放宽。

/// 工作区那一次的一个项目：名字（进提示词的分隔行）+ 它的 pack。
#[derive(serde::Deserialize, Clone)]
pub struct WsPack {
    pub title: String,
    pub text: String,
}

/// 「P2#3」—— 第几个项目（⚠️ 从 0 数，是 `packs` 的下标）、它里面的第几块（块自己的 `#N`）。
#[derive(serde::Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WsRef {
    pub project: usize,
    pub seq: i64,
}

/// 块级的一条：`stale` 那一块被 `by` 那一块整条取代了（可以跨项目）。
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WsBlockProposal {
    pub stale: WsRef,
    pub by: WsRef,
    pub why: String,
    pub quote_stale: String,
    pub quote_new: String,
    pub retyped: bool,
}

/// 项目级的一条：`project` 那个项目整个已经过时了，证据是 `by` 那一块。
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WsProjectProposal {
    pub project: usize,
    pub by: WsRef,
    pub why: String,
    pub quote_old: String,
    pub quote_new: String,
    pub retyped: bool,
}

/// ⛔ 没过闸的那一条 —— 和 `StaleDropped` 同一个理由：**连它说了什么一起带出去**。
/// `old_label` / `by_label` 是它写的原样（认不出来的编号界面照抄）；认得出来的同时给 `old` / `by`。
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WsDropped {
    /// `block` = A 那一类（整条取代），`project` = B 那一类（整个项目过时）。
    pub kind: &'static str,
    pub old_label: String,
    pub by_label: String,
    /// 块级：旧块。项目级：`seq` 是 0（只有项目）。
    pub old: Option<WsRef>,
    pub by: Option<WsRef>,
    pub why: String,
    /// 块级是 quote_stale，项目级是 quote_old。
    pub quote_old: String,
    pub quote_new: String,
    /// `no_ref` 编号认不出 · `no_project` 没有这个项目 · `no_block` 那个项目里没有这一块 ·
    /// `same_block` 指到了自己 · `quote_old` / `quote_new` 那一句找不到。
    pub reason: &'static str,
}

#[derive(serde::Serialize)]
pub struct WsStaleScan {
    pub outcome: CompressOutcome,
    pub blocks: Vec<WsBlockProposal>,
    pub projects: Vec<WsProjectProposal>,
    pub dropped: Vec<WsDropped>,
}

/// 「P3」→ `Some(2)`。⚠️ 大小写、首尾空白都放过 —— 编号不是引文，放宽它不会放进一句编出来的话。
fn ws_project_label(s: &str) -> Option<usize> {
    let s = s.trim();
    let digits = s.strip_prefix('P').or_else(|| s.strip_prefix('p'))?.trim();
    let n: usize = digits.parse().ok()?;
    n.checked_sub(1)
}

/// 「P2#3」/「P2 #3」→ `Some((1, 3))`。
fn ws_block_label(s: &str) -> Option<(usize, i64)> {
    let (p, b) = s.split_once('#')?;
    let project = ws_project_label(p)?;
    let seq: i64 = b.trim().parse().ok()?;
    Some((project, seq))
}

/// 回答里的那个 JSON 对象。⚠️ 它要是只回了一个数组（照「只查这个项目」那一份的老格式），
/// 就当成 A 那一类 —— 和 `json_array_slice` 一样，不把「它守规矩」当成前提。
fn ws_answer(text: &str) -> (Vec<serde_json::Value>, Vec<serde_json::Value>) {
    let t = text.trim();
    let array_first = match (t.find('['), t.find('{')) {
        (Some(a), Some(o)) => a < o,
        (Some(_), None) => true,
        _ => false,
    };
    if array_first {
        let items: Vec<serde_json::Value> = serde_json::from_str(json_array_slice(t)).unwrap_or_default();
        return (items, Vec::new());
    }
    let parsed: serde_json::Value = match (t.find('{'), t.rfind('}')) {
        (Some(a), Some(b)) if b > a => serde_json::from_str(&t[a..=b]).unwrap_or_default(),
        _ => serde_json::Value::Null,
    };
    let list = |k: &str| parsed.get(k).and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    (list("blocks"), list("projects"))
}

/// 一句引文在一个项目的哪一块里都行（项目级的 `quote_old`）。⚠️ 有一块一字不差就算一字不差，
/// 没有再看有没有「只差标点」的 —— 结果和 HashMap 的遍历顺序无关。
fn locate_in_any(quote: &str, blocks: &std::collections::HashMap<i64, String>) -> Quoted {
    let mut best = Quoted::Absent;
    for text in blocks.values() {
        match locate(quote, text) {
            Quoted::Verbatim => return Quoted::Verbatim,
            Quoted::Retyped => best = Quoted::Retyped,
            _ => {}
        }
    }
    best
}

/// 逐条过闸 —— `gate_proposals` 的工作区版。
fn gate_ws(raw: &str, packs: &[String]) -> (Vec<WsBlockProposal>, Vec<WsProjectProposal>, Vec<WsDropped>) {
    let per: Vec<std::collections::HashMap<i64, String>> = packs.iter().map(|p| blocks_of(p)).collect();
    let block_text = |r: WsRef| per.get(r.project).and_then(|m| m.get(&r.seq));
    let ok = |q: &Quoted| matches!(q, Quoted::Verbatim | Quoted::Retyped);
    let (block_items, project_items) = ws_answer(raw);
    let (mut blocks, mut projects, mut dropped) = (Vec::new(), Vec::new(), Vec::new());

    for item in block_items {
        let s = |k: &str| item.get(k).and_then(serde_json::Value::as_str).unwrap_or_default().to_string();
        // ⛔ 引文一个字符都不动（`gate_proposals` 里那段话）；只有 why 是给人读的，它才 trim。
        let (old_label, by_label, why, qs, qn) = (s("stale"), s("by"), s("why").trim().to_string(), s("quote_stale"), s("quote_new"));
        let old = ws_block_label(&old_label).map(|(project, seq)| WsRef { project, seq });
        let by = ws_block_label(&by_label).map(|(project, seq)| WsRef { project, seq });
        let drop = |reason: &'static str| WsDropped {
            kind: "block",
            old_label: old_label.clone(),
            by_label: by_label.clone(),
            old,
            by,
            why: why.clone(),
            quote_old: qs.clone(),
            quote_new: qn.clone(),
            reason,
        };
        let (Some(o), Some(b)) = (old, by) else {
            dropped.push(drop("no_ref"));
            continue;
        };
        if o.project >= packs.len() || b.project >= packs.len() {
            dropped.push(drop("no_project"));
            continue;
        }
        if o == b {
            dropped.push(drop("same_block"));
            continue;
        }
        let (Some(old_text), Some(new_text)) = (block_text(o), block_text(b)) else {
            dropped.push(drop("no_block"));
            continue;
        };
        let (a, c) = (locate(&qs, old_text), locate(&qn, new_text));
        if !ok(&a) {
            dropped.push(drop("quote_old"));
            continue;
        }
        if !ok(&c) {
            dropped.push(drop("quote_new"));
            continue;
        }
        blocks.push(WsBlockProposal {
            stale: o,
            by: b,
            why,
            quote_stale: qs,
            quote_new: qn,
            retyped: a == Quoted::Retyped || c == Quoted::Retyped,
        });
    }

    for item in project_items {
        let s = |k: &str| item.get(k).and_then(serde_json::Value::as_str).unwrap_or_default().to_string();
        let (old_label, by_label, why, qo, qn) = (s("project"), s("by"), s("why").trim().to_string(), s("quote_old"), s("quote_new"));
        let project = ws_project_label(&old_label);
        let by = ws_block_label(&by_label).map(|(project, seq)| WsRef { project, seq });
        let drop = |reason: &'static str| WsDropped {
            kind: "project",
            old_label: old_label.clone(),
            by_label: by_label.clone(),
            old: project.map(|p| WsRef { project: p, seq: 0 }),
            by,
            why: why.clone(),
            quote_old: qo.clone(),
            quote_new: qn.clone(),
            reason,
        };
        let (Some(p), Some(b)) = (project, by) else {
            dropped.push(drop("no_ref"));
            continue;
        };
        if p >= packs.len() || b.project >= packs.len() {
            dropped.push(drop("no_project"));
            continue;
        }
        let Some(new_text) = block_text(b) else {
            dropped.push(drop("no_block"));
            continue;
        };
        let (a, c) = (locate_in_any(&qo, &per[p]), locate(&qn, new_text));
        if !ok(&a) {
            dropped.push(drop("quote_old"));
            continue;
        }
        if !ok(&c) {
            dropped.push(drop("quote_new"));
            continue;
        }
        projects.push(WsProjectProposal {
            project: p,
            by: b,
            why,
            quote_old: qo,
            quote_new: qn,
            retyped: a == Quoted::Retyped || c == Quoted::Retyped,
        });
    }
    (blocks, projects, dropped)
}

fn ws_scan(outcome: CompressOutcome, packs: &[String]) -> WsStaleScan {
    let (blocks, projects, dropped) =
        if outcome.ok { gate_ws(&outcome.text, packs) } else { (Vec::new(), Vec::new(), Vec::new()) };
    WsStaleScan { outcome, blocks, projects, dropped }
}

fn ws_messages(packs: &[WsPack]) -> (String, String) {
    let pairs: Vec<(String, String)> = packs.iter().map(|p| (p.title.clone(), p.text.clone())).collect();
    crate::mcp::stale_ws_messages_for_api(&pairs)
}

/// P9V-1 — 过期检测查整个工作区，本机 CLI 那条路。和 `stale_scan_via_cli` 同一把锁、同一个 `ask_cli`
/// （不给工具、不连 MCP）。
#[tauri::command]
pub async fn stale_scan_ws_via_cli(
    app: tauri::AppHandle,
    packs: Vec<WsPack>,
    timeout_secs: u64,
    cli: CliRoute,
) -> Result<WsStaleScan, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let texts: Vec<String> = packs.iter().map(|p| p.text.clone()).collect();
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        let (system, user) = ws_messages(&packs);
        ask_cli(&cli, &system, &user, timeout_secs)
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    let outcome = out.unwrap_or_else(|e| CompressOutcome::failed("internal", e.to_string(), None));
    Ok(ws_scan(outcome, &texts))
}

/// P9V-1 — 过期检测查整个工作区，API 那条路。请求和 `stale_scan_via_api` 一模一样，只换了提示词。
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn stale_scan_ws_via_api(
    app: tauri::AppHandle,
    packs: Vec<WsPack>,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<WsStaleScan, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let texts: Vec<String> = packs.iter().map(|p| p.text.clone()).collect();
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        let (system, user) = ws_messages(&packs);
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return CompressOutcome::failed("no_sidecar", e, None),
        };
        let timeout_secs = clamp_timeout(timeout_secs);
        let request =
            sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, &wire, timeout_secs);
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
        };
        spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()))
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    let outcome = out.unwrap_or_else(|e| CompressOutcome::failed("internal", e.to_string(), None));
    Ok(ws_scan(outcome, &texts))
}

// ---------------------------------------------------------------------------------------
// 余额 —— 2026-08-26，Ocean：「能不能拿到用户的 api 剩余额度，目前使用 api 摩擦还是比较大，
// 用户需要反复查看余额，但是尽可能保住不出网叙事。」
//
// ⭐ **「不出网叙事」没被推翻，因为它走的还是同一个子进程、同一个用户自己填的端点。**
// 那句话现在的形状是「只有 spool-ai 会出去，而且只在你要它出去的时候」——查一次余额
// 是用户点的，或者一次已经出过网的运行刚结束时顺带的，⛔ 没有定时轮询。
// ⛔ 哪天有人想给它加个定时器，那才是真的推翻，要先问 Ocean。
//
// ⚠️ **它只对认得的那几家有效**，见 sidecar 里 `balance()` 的注释：余额不是 OpenAI 兼容
// 协议的一部分。问不到的时候界面要说「这家不报余额」，⛔ 不许显示 0。

/// 余额查询的结果。⚠️ 和 `CompressOutcome` 分开一个类型，是因为它**没有** token、没有
/// 花了多久、没有模型名 —— 挤进那个结构里只会多出六个永远是 0 的字段。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceOutcome {
    pub ok: bool,
    /// 币种（`CNY` / `USD` …）。失败时为空。
    pub currency: String,
    /// ⚠️ **原样的十进制字符串**，⛔ 不是数字：钱经过一次二进制浮点就可能变成 25.499999。
    /// 界面只把它印出来。
    pub total: String,
    /// 厂商说的「这个账号现在还能不能调用」。
    pub usable: bool,
    /// `unsupported` = 这家不报余额。⛔ 界面要把它和「查失败了」分开说。
    pub kind: Option<String>,
    pub message: Option<String>,
    pub status: Option<u16>,
}

impl BalanceOutcome {
    fn failed(kind: &str, message: String, status: Option<u16>) -> Self {
        Self {
            ok: false,
            currency: String::new(),
            total: String::new(),
            usable: false,
            kind: Some(kind.to_string()),
            message: Some(message),
            status,
        }
    }
}

fn parse_balance(stdout: &str) -> BalanceOutcome {
    let line = stdout.trim();
    let Ok(v) = serde_json::from_str::<serde_json::Value>(line) else {
        return BalanceOutcome::failed(
            "bad_response",
            format!("The sidecar's answer was not JSON: {}", clip(line)),
            None,
        );
    };
    if v.get("ok").and_then(|b| b.as_bool()) != Some(true) {
        return BalanceOutcome::failed(
            v.get("kind").and_then(|s| s.as_str()).unwrap_or("http"),
            v.get("message").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            v.get("status").and_then(|n| n.as_u64()).map(|n| n as u16),
        );
    }
    let pick = |k: &str| v.get(k).and_then(|s| s.as_str()).unwrap_or("").to_string();
    BalanceOutcome {
        ok: true,
        currency: pick("currency"),
        total: pick("total"),
        usable: v.get("usable").and_then(|b| b.as_bool()).unwrap_or(true),
        kind: None,
        message: None,
        status: None,
    }
}

/// 问一句余额。
///
/// ⛔⛔ **不占 `RUNNING` 那个闸。** 那个闸是给「一次只跑一个模型调用」用的，而这一条
/// 既不花钱也不吃额度（一次 GET），⚠️ 更要紧的是：「跑完顺带刷一次」这个用法**必然**
/// 发生在一次运行刚结束的那一刻。让它去抢那个闸，就是让它在最该刷新的时候刷不了。
///
/// ⚠️ 超时不从设置里读：一次 GET 二十秒还没回话，那不是「模型在想」，是这条路不通
/// （sidecar 那边写死 20 秒，这里给它一点余量收尾）。
#[tauri::command]
pub async fn api_balance(
    base_url: String,
    api_key: String,
) -> Result<BalanceOutcome, String> {
    let out = tauri::async_runtime::spawn_blocking(move || {
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return BalanceOutcome::failed("no_sidecar", e, None),
        };
        let request = serde_json::json!({
            "kind": "balance",
            "base_url": base_url,
            "api_key": api_key,
            // ⚠️ 这三个是请求结构里的必填字段，查余额那条路一个都不读 —— 但少一个，
            // 子进程会把整个请求判成「不是合法 JSON」并非零退出。
            "model": "",
            "system": "",
            "user": "",
            "timeout_secs": 25u64,
        });
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return BalanceOutcome::failed("internal", e.to_string(), None),
        };
        // ⛔ 不走 `spawn_sidecar_with`：那条会把子进程的句柄挂进 `CHILD`，而 `CHILD`
        // 是「停下」按钮瞄准的地方 —— 一次查余额挂上去，就会把用户正在跑的那次压缩
        // 从取消按钮底下顶掉。这条路自己起、自己收。
        match run_balance_child(&bin, payload) {
            Ok(stdout) => parse_balance(&stdout),
            Err(e) => BalanceOutcome::failed("internal", e, None),
        }
    })
    .await;
    Ok(match out {
        Ok(o) => o,
        Err(e) => BalanceOutcome::failed("internal", e.to_string(), None),
    })
}

/// 起一次子进程、喂 stdin、等它退出。⚠️ 二十五秒是硬上限：子进程自己 20 秒就会写一个
/// timeout 信封出来，这里只是兜住「它连信封都没写出来」的情况。
fn run_balance_child(bin: &std::path::Path, payload: Vec<u8>) -> Result<String, String> {
    use std::io::Write;
    let mut child = Command::new(bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    child
        .stdin
        .take()
        .ok_or_else(|| "no stdin on the sidecar".to_string())?
        .write_all(&payload)
        .map_err(|e| e.to_string())?;
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

/// 这个 key 能用的模型（P9U-3，第 188 条：「模型从那家接口拉列表让人挑」）。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsOutcome {
    pub ok: bool,
    pub models: Vec<String>,
    /// `auth` = 这个 key 这个地址不认（前端拿它去试同一家另一个地区）；`unsupported` = 这家不给列表。
    pub kind: Option<String>,
    pub message: Option<String>,
    pub status: Option<u16>,
}

fn parse_models(stdout: &str) -> ModelsOutcome {
    let failed = |kind: &str, message: String, status: Option<u16>| ModelsOutcome {
        ok: false,
        models: Vec::new(),
        kind: Some(kind.to_string()),
        message: Some(message),
        status,
    };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(stdout.trim()) else {
        return failed("bad_response", format!("The sidecar's answer was not JSON: {}", clip(stdout.trim())), None);
    };
    if v.get("ok").and_then(|b| b.as_bool()) != Some(true) {
        return failed(
            v.get("kind").and_then(|s| s.as_str()).unwrap_or("http"),
            v.get("message").and_then(|s| s.as_str()).unwrap_or("").to_string(),
            v.get("status").and_then(|n| n.as_u64()).map(|n| n as u16),
        );
    }
    let models = v
        .get("models")
        .and_then(|m| m.as_array())
        .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
        .unwrap_or_default();
    ModelsOutcome { ok: true, models, kind: None, message: None, status: None }
}

/// 问一句「这个 key 能用哪些模型」。⚠️ 不计费（一次 GET），也不占 `RUNNING`，理由和 `api_balance` 一样；
/// 同样自己起、自己收，不挂进 `CHILD`。
#[tauri::command]
pub async fn api_models(
    base_url: String,
    api_key: String,
    protocol: String,
    key_check_path: Option<String>,
) -> Result<ModelsOutcome, String> {
    let out = tauri::async_runtime::spawn_blocking(move || {
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return parse_models(&serde_json::json!({ "ok": false, "kind": "no_sidecar", "message": e }).to_string()),
        };
        let request = serde_json::json!({
            "kind": "models",
            "protocol": protocol,
            "key_check_path": key_check_path.unwrap_or_default(),
            "base_url": base_url,
            "api_key": api_key,
            // 必填字段，这条路不读（见 `api_balance`）。
            "model": "",
            "system": "",
            "user": "",
            "timeout_secs": 25u64,
        });
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return parse_models(&serde_json::json!({ "ok": false, "kind": "internal", "message": e.to_string() }).to_string()),
        };
        match run_balance_child(&bin, payload) {
            Ok(stdout) => parse_models(&stdout),
            Err(e) => parse_models(&serde_json::json!({ "ok": false, "kind": "internal", "message": e }).to_string()),
        }
    })
    .await;
    Ok(out.unwrap_or_else(|e| parse_models(&serde_json::json!({ "ok": false, "kind": "internal", "message": e.to_string() }).to_string())))
}

// ---------------------------------------------------------------------------------------
// 周回顾走这条路 —— 2026-08-25，Ocean：「CLI 只支持 codex 和 claude，这两个模型太贵了
// （gemini 的能力有限，且额度少），加入 deepseek 的周总结，总结的 model 可以让用户自行选择」。
//
// ⭐ 「模型自行选择」**这一半本来就有**：设置里那个「模型」输入框（`ApiEngineConfig.tsx`）
// 写的就是 `apiModel`，默认 `deepseek-v4-flash`，端点也是用户自己填的。
// ⇒ 这一段补的只是「周回顾也能走这条路」，⛔ 不是又发明一套模型设置。
//
// ⚠️ 和压缩 / 过期检测的**唯一**区别：材料是在 Rust 这边自己开库拼的
// （`weekly_material_for_api`），不从前端接 —— 跨全库的东西前端手上没有。
//
// ⛔ 这条路一个字都不往库里写。回顾正文回给前端，由前端按老路子记进 `engine_runs`，
// 存不存成块仍然是用户的事（和形态 B 那条一样）。
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn weekly_review_via_api(
    app: tauri::AppHandle,
    since_days: Option<i64>,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<CompressOutcome, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let out = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(dir) = tauri::Manager::path(&app).app_config_dir() {
            crate::mcp::refresh_lang(&dir);
        }
        // ⚠️ 拼材料失败要当成一次失败的运行回出去，⛔ 不是 panic，也不是空材料硬发 ——
        // 空材料发出去只会换回一段编的回顾，而钱已经花了。
        let (digest, fresh, follow_ups) = match crate::mcp::weekly_material_for_api(since_days) {
            Ok(m) => m,
            Err(e) => return CompressOutcome::failed("internal", e, None),
        };
        let (system, user, quotable) = crate::mcp::weekly_messages_for_api(&digest, &fresh, &follow_ups);
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return CompressOutcome::failed("no_sidecar", e, None),
        };
        let timeout_secs = clamp_timeout(timeout_secs);
        let request =
            sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, &wire, timeout_secs);
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
        };
        let mut outcome = spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()));
        // P10-1：回来的那一段在这里读成数据，存的是读好的那一份。⛔ 读不成 = 整次失败、不交半份；
        // 用量照留（钱已经花了，那一行要记得住）。P10-2：引文拿这一次发出去的材料原文比（历史 + 这一周
        // 新加的；⛔ 不含「还开着的跟进」那一段，见 `weekly_messages_for_api`）。
        if outcome.ok {
            match crate::mcp::weekly_structured(&outcome.text, &quotable, false) {
                Ok(json) => outcome.text = json,
                Err(e) => {
                    outcome.ok = false;
                    outcome.kind = Some("bad_json".into());
                    outcome.message = Some(e);
                    outcome.text.clear();
                }
            }
        }
        outcome
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    Ok(match out {
        Ok(o) => o,
        Err(e) => CompressOutcome::failed("internal", e.to_string(), None),
    })
}

// ---------------------------------------------------------------------------------------
// 跟进走这条路 —— P9U-4（Ocean 2026-10-24 第 186 条：「API 的跟进用各家自带的联网搜索」）。
//
// ⚠️ 和 CLI 那条的区别只在「谁来把结果放进待审」：CLI 带着 MCP 自己调 propose_blocks；这一条没有 MCP，
// 那家搜完回一个 JSON 对象，由 Spool 拿**同一批函数**放进去（`mcp::apply_follow_up_answer`）——
// 标签、上限、待审面一样，回到前端之后过的也是同一道去重闸（engineStore `siftFollowUp`）。
// ⛔ 私密项目读不到（`open_db`），所以这里也跑不了它 —— 和 P9E-3 那条规矩一致。
// ---------------------------------------------------------------------------------------

/// 一次 API 跟进的结果：那一趟的信封（钱、模型、失败原因），和放进去了多少。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowUpApiOutcome {
    pub outcome: CompressOutcome,
    /// `None` = 没走到放进去那一步（那一趟失败了，或者回答不是约定的 JSON —— 原因在 outcome 里）。
    pub filed: Option<crate::mcp::FollowUpFiled>,
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn follow_up_via_api(
    app: tauri::AppHandle,
    thread_id: String,
    vendor: String,
    search: String,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<FollowUpApiOutcome, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let out = tauri::async_runtime::spawn_blocking(move || {
        let (_, system, user) = match crate::mcp::follow_up_messages_for_api(&thread_id) {
            Ok(m) => m,
            Err(e) => return FollowUpApiOutcome { outcome: CompressOutcome::failed("internal", e, None), filed: None },
        };
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return FollowUpApiOutcome { outcome: CompressOutcome::failed("no_sidecar", e, None), filed: None },
        };
        let timeout_secs = clamp_timeout(timeout_secs);
        let mut request =
            sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, &wire, timeout_secs);
        request["kind"] = serde_json::json!("search");
        request["search"] = serde_json::json!(search);
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => {
                return FollowUpApiOutcome { outcome: CompressOutcome::failed("internal", e.to_string(), None), filed: None }
            }
        };
        let mut outcome = spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()));
        if !outcome.ok {
            return FollowUpApiOutcome { outcome, filed: None };
        }
        match crate::mcp::apply_follow_up_answer(&thread_id, &outcome.text, &vendor) {
            Ok(filed) => FollowUpApiOutcome { outcome, filed: Some(filed) },
            // ⚠️ 钱已经花了、回答也拿到了，只是没法照约定放进去 —— 报成失败，⛔ 不报成「这次没有新东西」。
            Err(e) => {
                outcome.ok = false;
                outcome.kind = Some("bad_response".into());
                outcome.message = Some(e);
                FollowUpApiOutcome { outcome, filed: None }
            }
        }
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    Ok(out.unwrap_or_else(|e| FollowUpApiOutcome {
        outcome: CompressOutcome::failed("internal", e.to_string(), None),
        filed: None,
    }))
}

/// 「让 AI 看看还缺什么」走这条路（P9U-5 补：它也是跟进的一部分 —— Ocean「跟进功能也在内」）。
/// ⚠️ 不联网、不写库：起草出来的几行回给面板，由用户决定要不要（§6-2），和 CLI 那条一样。
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn follow_up_brief_via_api(
    app: tauri::AppHandle,
    thread_id: String,
    base_url: String,
    api_key: String,
    model: String,
    reasoning: String,
    wire: Option<ApiWire>,
    timeout_secs: u64,
) -> Result<CompressOutcome, String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Err("a run is already in flight".into());
    }
    let wire = ApiWire::or_legacy(wire);
    let out = tauri::async_runtime::spawn_blocking(move || {
        let (system, user) = match crate::mcp::follow_up_brief_messages_for_api(&thread_id) {
            Ok(m) => m,
            Err(e) => return CompressOutcome::failed("internal", e, None),
        };
        let bin = match sidecar_path() {
            Ok(p) => p,
            Err(e) => return CompressOutcome::failed("no_sidecar", e, None),
        };
        let timeout_secs = clamp_timeout(timeout_secs);
        let request =
            sidecar_request(&base_url, &api_key, &model, &system, &user, &reasoning, &wire, timeout_secs);
        let payload = match serde_json::to_vec(&request) {
            Ok(v) => v,
            Err(e) => return CompressOutcome::failed("internal", e.to_string(), None),
        };
        spawn_sidecar_with(&bin, payload, timeout_secs, Some(app.clone()))
    })
    .await;
    RUNNING.store(false, Ordering::SeqCst);
    *CHILD.lock().unwrap() = None;
    Ok(out.unwrap_or_else(|e| CompressOutcome::failed("internal", e.to_string(), None)))
}

// ---------------------------------------------------------------------------------------
// P9U 真跑（Ocean 2026-10-24 同意：「真跑本机 Codex 要，项目你选」「OpenAI 的 key 给你」）。
//
// ⛔ 只在库的**副本**上跑：`SPOOL_DATA_DIR` 指向一份 `VACUUM INTO` 出来的副本。压缩和过期检测本来就
// 一个字不写；跟进那一条会把提议写进**副本**的待审表，用来看放进去的样子。key 只从环境变量读、不打印。
//
//   SPOOL_DATA_DIR=<副本目录> SPOOL_P9U_THREAD=<项目 id> SPOOL_P9U_OUT=<输出目录> \
//     cargo test --lib real_cli_ -- --ignored --nocapture
//   SPOOL_DATA_DIR=… SPOOL_P9U_THREAD=… SPOOL_P9U_OPENAI_KEY=… SPOOL_P9U_MODEL=… \
//     cargo test --lib real_api_follow_up -- --ignored --nocapture
// ---------------------------------------------------------------------------------------
#[cfg(test)]
mod p9u_real_runs {
    use super::*;

    fn env(k: &str) -> String {
        std::env::var(k).unwrap_or_else(|_| panic!("set {k}"))
    }

    fn assert_on_a_copy() {
        let dir = env("SPOOL_DATA_DIR");
        assert!(!dir.contains("Application Support"), "real runs go against a copy, never the live library");
    }

    #[test]
    #[ignore = "real Codex run against a library copy; see the header"]
    fn real_cli_compress_and_stale_on_a_copy() {
        assert_on_a_copy();
        let thread = env("SPOOL_P9U_THREAD");
        let out = std::path::PathBuf::from(env("SPOOL_P9U_OUT"));
        let pack = crate::mcp::pack_text_for_test(&thread).unwrap();
        std::fs::write(out.join("pack.txt"), &pack).unwrap();
        let cli = CliRoute { engine: Some("codex".into()), model: None, effort: None, manual_path: None };

        // The GUI sends the SHIELDED pack (notes, relation lines and ==highlights== taken out, put back after —
        // compressStore `shieldPack`); SPOOL_P9U_SEND names that file when the TS side has made it.
        let send = std::env::var("SPOOL_P9U_SEND").ok().map(|f| std::fs::read_to_string(f).unwrap()).unwrap_or_else(|| pack.clone());
        let (system, user) = compress_messages_for_api(&send, CompressLevel::Balanced);
        let mut c = ask_cli_inner(&cli, &system, &user, 600);
        println!("compress: ok={} kind={:?} msg={:?} model={:?} ms={} in={} out={}", c.ok, c.kind, c.message, c.model, c.ms, c.input_tokens, c.output_tokens);
        if c.ok {
            c.text = keep_pack_boundaries(&send, &c.text);
            println!("compress: {} → {} chars; cuts={:?}", send.chars().count(), c.text.chars().count(), c.cuts);
            let name = if std::env::var("SPOOL_P9U_SEND").is_ok() { "compressed-shielded.txt" } else { "compressed.txt" };
            std::fs::write(out.join(name), &c.text).unwrap();
        }
        if std::env::var("SPOOL_P9U_ONLY_COMPRESS").is_ok() {
            assert!(c.ok);
            return;
        }

        let (system, user) = crate::mcp::stale_messages_for_api(&pack);
        let s = ask_cli_inner(&cli, &system, &user, 600);
        println!("stale: ok={} kind={:?} msg={:?} ms={}", s.ok, s.kind, s.message, s.ms);
        if s.ok {
            let (proposals, dropped) = gate_proposals(&s.text, &pack);
            println!("stale: {} through the verbatim gate, {} dropped", proposals.len(), dropped.len());
            for p in &proposals {
                println!("  #{} → #{}: {} | retyped={}", p.stale_seq, p.by_seq, p.why, p.retyped);
            }
            for d in &dropped {
                println!("  dropped: {:?}", d.reason);
            }
            std::fs::write(out.join("stale-raw.txt"), &s.text).unwrap();
        }
        assert!(c.ok && s.ok, "both runs should come back");
    }

    #[test]
    #[ignore = "real OpenAI web search against a library copy; see the header"]
    fn real_api_follow_up_on_a_copy() {
        assert_on_a_copy();
        let thread = env("SPOOL_P9U_THREAD");
        let (title, system, user) = crate::mcp::follow_up_messages_for_api(&thread).unwrap();
        println!("project: {title}; prompt {} + {} chars", system.chars().count(), user.chars().count());
        let wire = ApiWire { protocol: "openai".into(), temperature: None, max_output_tokens: None };
        let mut request = sidecar_request(
            "https://api.openai.com/v1",
            &env("SPOOL_P9U_OPENAI_KEY"),
            &env("SPOOL_P9U_MODEL"),
            &system,
            &user,
            "",
            &wire,
            600,
        );
        request["kind"] = serde_json::json!("search");
        request["search"] = serde_json::json!("openai");
        let bin = sidecar_path().unwrap();
        let o = spawn_sidecar(&bin, serde_json::to_vec(&request).unwrap(), 600);
        println!("search: ok={} kind={:?} msg={:?} model={:?} ms={} in={} out={} reasoning={:?}", o.ok, o.kind, o.message, o.model, o.ms, o.input_tokens, o.output_tokens, o.reasoning_tokens);
        assert!(o.ok);
        println!("--- answer ---\n{}\n---", o.text);
        let filed = crate::mcp::apply_follow_up_answer(&thread, &o.text, "OpenAI").unwrap();
        println!("filed: {filed:?}");
    }
}

#[cfg(test)]
mod stale_gate_tests {
    use super::*;

    const PACK: &str = "# Project Context: 申请规划\n\
\n\
## Full Record (chronological)\n\
\n\
#2 [2026-08-01 09:00 · from Claude] 名单定稿：15 所，含 UMich MSI。\n\
#21 [2026-08-09 21:07 · from Claude] 名单重定：移出 UMich MSI，加入 CMU MSAII（16 个月）。\n";

    /// ⚠️ 下面这些断言只关心「丢了几条」，所以这里把丢掉的那一堆折成一个数。
    /// ⛔ 别把它当成产品那条路 —— 产品拿的是整条（`StaleDropped`），界面要摆出来给人看。
    fn gate(items: &str) -> (Vec<StaleProposal>, usize) {
        let (kept, dropped) = gate_proposals(items, PACK);
        (kept, dropped.len())
    }

    #[test]
    fn a_verbatim_pair_gets_through() {
        let (kept, dropped) = gate(
            r#"[{"stale":2,"by":21,"why":"名单重定","quote_stale":"含 UMich MSI","quote_new":"移出 UMich MSI"}]"#,
        );
        assert_eq!(dropped, 0);
        assert_eq!(kept.len(), 1);
        assert!(!kept[0].retyped);
        assert_eq!(kept[0].stale_seq, 2);
        assert_eq!(kept[0].by_seq, 21);
    }

    // ⛔ 这一条是整道闸存在的理由：提示词向模型承诺「对不上的整条丢掉」，
    //    那句承诺必须是真的 —— 否则用户要凭一句模型自己编的话决定退不退一个块。
    #[test]
    fn an_invented_quote_takes_the_whole_item_with_it() {
        let (kept, dropped) = gate(
            r#"[{"stale":2,"by":21,"why":"x","quote_stale":"这句话原文里根本没有","quote_new":"移出 UMich MSI"}]"#,
        );
        assert_eq!(kept.len(), 0);
        assert_eq!(dropped, 1);
    }

    // 只差标点的重打放行，但**必须报出来** —— 它确实破了「逐字」，只是没改内容。
    #[test]
    fn punctuation_retyped_gets_through_and_says_so() {
        let (kept, _) = gate(
            r#"[{"stale":2,"by":21,"why":"x","quote_stale":"名单定稿:15 所,含 UMich MSI","quote_new":"移出 UMich MSI"}]"#,
        );
        assert_eq!(kept.len(), 1);
        assert!(kept[0].retyped, "重打了标点却没报出来");
    }

    // ⛔⛔ 数字一个都不折叠。改一个数字就是改了内容，整条丢掉。
    #[test]
    fn a_retyped_digit_is_never_folded_away() {
        let (kept, dropped) = gate(
            r#"[{"stale":2,"by":21,"why":"x","quote_stale":"名单定稿：16 所","quote_new":"移出 UMich MSI"}]"#,
        );
        assert_eq!(kept.len(), 0, "改了数字的引文放进来了");
        assert_eq!(dropped, 1);
    }

    // ⭐⭐ T4(2026-08-23,第五轮实测):**闸门和渲染器必须是同一把尺子。**
    //
    // 实测撞到的那一条:一条更正进库的时候引文是逐字对得上的;之后这个项目被压缩过一次,
    // 压缩把 `个：UCLA` 改写成 `个:UCLA`(那一份换掉了 46% 的全角标点),R1 之后
    // 压缩稿写回 `content` —— 于是 pack 里那行「更正了哪一句」退回只报块号,
    // 屏幕上那句高亮消失,**而界面不报任何错**。
    #[test]
    fn the_renderer_locates_a_quote_the_gate_would_have_let_through() {
        let after_compression = "第一批三个:UCLA,CMU,UMich.";
        let quote = "第一批三个：UCLA";
        assert!(!after_compression.contains(quote), "这条测试的前提没了");
        assert!(quote_is_in_block(after_compression, quote));
    }

    // ⛔ 反过来那一半:尺子松到「什么都能对上」就成了假高亮。
    #[test]
    fn a_quote_that_is_really_gone_stays_gone() {
        assert!(!quote_is_in_block("名单里只有 UCLA。", "名单里只有 CMU。"));
        assert!(!quote_is_in_block("随便什么", ""));
        // 数字仍然不折叠 —— 15 所和 16 所不是同一句话。
        assert!(!quote_is_in_block("名单定稿：15 所", "名单定稿:16 所"));
    }

    // ⚠️ 省略号故意不在折叠表里：提示词明写「不许用省略号」，用了就是破规矩。
    #[test]
    fn an_ellipsis_is_breaking_the_rule_not_retyping() {
        let (kept, dropped) =
            gate(r#"[{"stale":2,"by":21,"why":"x","quote_stale":"名单定稿：15 所…MSI","quote_new":"移出 UMich MSI"}]"#);
        assert_eq!(kept.len(), 0);
        assert_eq!(dropped, 1);
    }

    #[test]
    fn a_block_number_the_pack_does_not_have_is_dropped() {
        let (kept, dropped) =
            gate(r#"[{"stale":99,"by":21,"why":"x","quote_stale":"含 UMich MSI","quote_new":"移出 UMich MSI"}]"#);
        assert_eq!(kept.len(), 0);
        assert_eq!(dropped, 1);
    }

    // 模型没守「不要代码块标记」那一条也要解析得出来 —— 一个只在它守规矩时才 work
    // 的解析器，等于把守规矩当成了前提。
    #[test]
    fn a_fenced_answer_still_parses() {
        let (kept, _) = gate(
            "```json\n[{\"stale\":2,\"by\":21,\"why\":\"x\",\"quote_stale\":\"含 UMich MSI\",\"quote_new\":\"移出 UMich MSI\"}]\n```",
        );
        assert_eq!(kept.len(), 1);
    }

    // ⭐ 2026-08-23（Ocean 第 8 条「不允许 Spool 不告诉我」）：丢掉的那一条要**带着内容**
    // 回来，而且要说得出它是**哪一步**没过 —— 界面靠这个字段挑话说。
    #[test]
    fn a_dropped_item_comes_back_with_what_it_said() {
        let (kept, dropped) = gate_proposals(
            r#"[{"stale":2,"by":21,"why":"名单重定","quote_stale":"这句话原文里根本没有","quote_new":"移出 UMich MSI"}]"#,
            PACK,
        );
        assert_eq!(kept.len(), 0);
        assert_eq!(dropped.len(), 1);
        assert_eq!(dropped[0].reason, "quote_stale");
        assert_eq!(dropped[0].stale_seq, Some(2));
        assert_eq!(dropped[0].by_seq, Some(21));
        assert_eq!(dropped[0].why, "名单重定");
        assert_eq!(dropped[0].quote_stale, "这句话原文里根本没有");
    }

    #[test]
    fn a_number_the_pack_does_not_have_says_which_step_failed() {
        let (_, dropped) = gate_proposals(
            r#"[{"stale":99,"by":21,"why":"x","quote_stale":"含 UMich MSI","quote_new":"移出 UMich MSI"}]"#,
            PACK,
        );
        assert_eq!(dropped[0].reason, "no_block");
    }

    #[test]
    fn nothing_found_is_a_normal_answer() {
        let (kept, dropped) = gate("[]");
        assert_eq!(kept.len(), 0);
        assert_eq!(dropped, 0);
    }

    #[test]
    fn entry_lines_are_read_the_same_way_the_ts_side_reads_them() {
        assert_eq!(crate::mcp::entry_seq("#12 [2026-08-01] x"), Some(12));
        assert_eq!(crate::mcp::entry_seq("📌 💭 #7 [2026-08-01] x"), Some(7));
        assert_eq!(crate::mcp::entry_seq("🗜 #6 [2026-08-01] x"), Some(6));
        // 正文里的 `#12` 不是条目头行。
        assert_eq!(crate::mcp::entry_seq("见 #12 那一条"), None);
        assert_eq!(crate::mcp::entry_seq("#12 没有方括号"), None);
    }
}

#[cfg(test)]
mod stale_ws_tests {
    use super::*;

    // Two projects; both have a `#3` on purpose — the numbering collides across projects.
    const A: &str = "# Project Context: midi-GPT\n\
\n\
## Full Record (chronological)\n\
\n\
#2 [2026-10-01 09:00 · from Claude] 方案定了：用 REMI 编码，训练集 2 万首。\n\
#3 [2026-10-02 10:00] 下周三前交开题报告。\n";
    const B: &str = "# Project Context: Flux\n\
\n\
## Full Record (chronological)\n\
\n\
#3 [2026-10-05 11:00] 导师说别再单独做 midi-GPT 了。\n\
#5 [2026-10-07 21:00 · from Claude] 改方案：放弃 REMI，改用 Compound Word 编码，midi-GPT 并进 Flux。\n";

    fn packs() -> Vec<String> {
        vec![A.to_string(), B.to_string()]
    }

    #[test]
    fn the_prompt_numbers_projects_in_order_and_fences_them() {
        let (system, user) = crate::mcp::stale_ws_messages_for_api(&[
            ("midi-GPT".into(), A.into()),
            ("Flux".into(), B.into()),
        ]);
        assert!(system.contains("P2#3"), "{system}");
        assert!(system.contains(r##"{"blocks": [], "projects": []}"##));
        assert!(!system.contains("{rule}") && !system.contains("{why_lang}"));
        let (p1, p2) = (user.find("==== P1 · 〈midi-GPT〉 ====").unwrap(), user.find("==== P2 · 〈Flux〉 ====").unwrap());
        assert!(p1 < p2);
        assert!(user.starts_with('\u{27e6}') && user.trim_end().ends_with('\u{27e7}'), "{user}");
    }

    #[test]
    fn a_cross_project_pair_gets_through() {
        let (blocks, projects, dropped) = gate_ws(
            r##"{"blocks":[{"stale":"P1#2","by":"P2#5","why":"编码换了","quote_stale":"用 REMI 编码","quote_new":"放弃 REMI"}],"projects":[]}"##,
            &packs(),
        );
        assert!(dropped.is_empty(), "{dropped:?}");
        assert!(projects.is_empty());
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].stale, WsRef { project: 0, seq: 2 });
        assert_eq!(blocks[0].by, WsRef { project: 1, seq: 5 });
        assert!(!blocks[0].retyped);
    }

    #[test]
    fn the_same_number_in_two_projects_is_two_blocks() {
        // The quote is in Flux's #3, not midi-GPT's #3 — so P1#3 does not hold it.
        let (blocks, _, dropped) = gate_ws(
            r##"{"blocks":[{"stale":"P1#3","by":"P2#5","why":"x","quote_stale":"别再单独做 midi-GPT 了","quote_new":"midi-GPT 并进 Flux"}]}"##,
            &packs(),
        );
        assert!(blocks.is_empty());
        assert_eq!(dropped.len(), 1);
        assert_eq!(dropped[0].reason, "quote_old");
        assert_eq!(dropped[0].old, Some(WsRef { project: 0, seq: 3 }));
    }

    #[test]
    fn bad_references_are_dropped_with_what_was_said() {
        let (blocks, projects, dropped) = gate_ws(
            r##"{"blocks":[
                {"stale":"#2","by":"P2#5","why":"没写项目","quote_stale":"用 REMI 编码","quote_new":"放弃 REMI"},
                {"stale":"P9#2","by":"P2#5","why":"没有 P9","quote_stale":"用 REMI 编码","quote_new":"放弃 REMI"},
                {"stale":"P1#99","by":"P2#5","why":"没有这一块","quote_stale":"用 REMI 编码","quote_new":"放弃 REMI"},
                {"stale":"P2#5","by":"P2 #5","why":"自己","quote_stale":"放弃 REMI","quote_new":"放弃 REMI"}
            ],"projects":[]}"##,
            &packs(),
        );
        assert!(blocks.is_empty() && projects.is_empty());
        let reasons: Vec<&str> = dropped.iter().map(|d| d.reason).collect();
        assert_eq!(reasons, ["no_ref", "no_project", "no_block", "same_block"]);
        assert_eq!(dropped[0].old_label, "#2");
        assert_eq!(dropped[0].why, "没写项目");
        assert_eq!(dropped[0].kind, "block");
    }

    #[test]
    fn a_changed_digit_is_not_a_retype() {
        let (blocks, _, dropped) = gate_ws(
            r##"{"blocks":[{"stale":"P1#2","by":"P2#5","why":"x","quote_stale":"训练集 3 万首","quote_new":"放弃 REMI"}]}"##,
            &packs(),
        );
        assert!(blocks.is_empty());
        assert_eq!(dropped[0].reason, "quote_old");
    }

    #[test]
    fn a_whole_project_gets_through_with_a_quote_from_any_of_its_blocks() {
        let (blocks, projects, dropped) = gate_ws(
            r##"{"blocks":[],"projects":[{"project":"P1","by":"P2#3","why":"并进 Flux 了","quote_old":"下周三前交开题报告","quote_new":"别再单独做 midi-GPT 了"}]}"##,
            &packs(),
        );
        assert!(blocks.is_empty() && dropped.is_empty(), "{dropped:?}");
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].project, 0);
        assert_eq!(projects[0].by, WsRef { project: 1, seq: 3 });
    }

    #[test]
    fn a_project_quote_from_another_project_is_dropped() {
        let (_, projects, dropped) = gate_ws(
            r##"{"projects":[{"project":"P1","by":"P2#3","why":"x","quote_old":"改用 Compound Word 编码","quote_new":"别再单独做 midi-GPT 了"}]}"##,
            &packs(),
        );
        assert!(projects.is_empty());
        assert_eq!(dropped[0].kind, "project");
        assert_eq!(dropped[0].reason, "quote_old");
        assert_eq!(dropped[0].old, Some(WsRef { project: 0, seq: 0 }));
    }

    #[test]
    fn a_project_without_evidence_block_is_dropped() {
        let (_, projects, dropped) = gate_ws(
            r##"{"projects":[{"project":"P1","by":"P2","why":"x","quote_old":"下周三前交开题报告","quote_new":"别再单独做 midi-GPT 了"}]}"##,
            &packs(),
        );
        assert!(projects.is_empty());
        assert_eq!(dropped[0].reason, "no_ref");
    }

    #[test]
    fn a_bare_array_or_a_fenced_answer_still_reads() {
        let (blocks, _, _) = gate_ws(
            r##"[{"stale":"P1#2","by":"P2#5","why":"x","quote_stale":"用 REMI 编码","quote_new":"放弃 REMI"}]"##,
            &packs(),
        );
        assert_eq!(blocks.len(), 1);
        let (blocks, _, _) = gate_ws(
            "```json\n{\"blocks\":[{\"stale\":\"p1 # 2\",\"by\":\"P2#5\",\"why\":\"x\",\"quote_stale\":\"用 REMI 编码\",\"quote_new\":\"放弃 REMI\"}],\"projects\":[]}\n```",
            &packs(),
        );
        assert_eq!(blocks.len(), 1);
    }

    #[test]
    fn nothing_found_or_nonsense_is_nothing() {
        for raw in [r##"{"blocks": [], "projects": []}"##, "我没找到。", ""] {
            let (b, p, d) = gate_ws(raw, &packs());
            assert!(b.is_empty() && p.is_empty() && d.is_empty(), "{raw}");
        }
    }

    #[test]
    fn a_failed_run_is_not_gated() {
        let scan = ws_scan(CompressOutcome::failed("http", "boom".into(), Some(500)), &packs());
        assert!(scan.blocks.is_empty() && scan.projects.is_empty() && scan.dropped.is_empty());
    }
}

/// P9V-6 real runs (`--ignored`): the packs a 「查整个工作区」 sends, built by the app's own TS code from a
/// `VACUUM INTO` copy and written to SPOOL_P9V_PACKS (a JSON array of {title, text}) — this side never opens
/// a library. Key (API run only) via the environment, never a file.
#[cfg(test)]
mod p9v_real_runs {
    use super::*;

    fn env(k: &str) -> String {
        std::env::var(k).unwrap_or_else(|_| panic!("set {k}"))
    }

    fn packs() -> Vec<WsPack> {
        let path = env("SPOOL_P9V_PACKS");
        assert!(!path.contains("Application Support"), "packs come from a copy, never the live library");
        let raw: Vec<serde_json::Value> = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
        raw.iter()
            .map(|v| WsPack { title: v["title"].as_str().unwrap().into(), text: v["text"].as_str().unwrap().into() })
            .collect()
    }

    fn report(o: &CompressOutcome, packs: &[WsPack]) {
        println!("ok={} kind={:?} msg={:?} model={:?} ms={} in={} out={}", o.ok, o.kind, o.message, o.model, o.ms, o.input_tokens, o.output_tokens);
        let out = std::path::PathBuf::from(env("SPOOL_P9V_OUT"));
        std::fs::write(out.join("ws-stale-raw.txt"), &o.text).unwrap();
        let texts: Vec<String> = packs.iter().map(|p| p.text.clone()).collect();
        let (blocks, projects, dropped) = gate_ws(&o.text, &texts);
        let name = |i: usize| packs.get(i).map(|p| p.title.as_str()).unwrap_or("?");
        println!("through the gate: {} block(s), {} project(s); dropped {}", blocks.len(), projects.len(), dropped.len());
        for b in &blocks {
            println!("  block 〈{}〉#{} → 〈{}〉#{}: {} | retyped={}", name(b.stale.project), b.stale.seq, name(b.by.project), b.by.seq, b.why, b.retyped);
        }
        for p in &projects {
            println!("  project 〈{}〉 by 〈{}〉#{}: {} | retyped={}", name(p.project), name(p.by.project), p.by.seq, p.why, p.retyped);
        }
        for d in &dropped {
            println!("  dropped {} {} → {}: {} ({})", d.kind, d.old_label, d.by_label, d.reason, d.why);
        }
    }

    #[test]
    #[ignore = "real Codex run on packs built from a library copy; see the header"]
    fn real_cli_ws_stale_on_a_copy() {
        let packs = packs();
        let (system, user) = ws_messages(&packs);
        println!("{} projects, prompt {} + {} chars", packs.len(), system.chars().count(), user.chars().count());
        let cli = CliRoute { engine: Some("codex".into()), model: None, effort: None, manual_path: None };
        let o = ask_cli_inner(&cli, &system, &user, 900);
        report(&o, &packs);
        assert!(o.ok);
    }

    #[test]
    #[ignore = "real API run on packs built from a library copy; see the header"]
    fn real_api_ws_stale_on_a_copy() {
        let packs = packs();
        let (system, user) = ws_messages(&packs);
        // Same wire the app sends for that vendor (vendors.ts `wireFor`) — DeepSeek: openai · temperature 0.2.
        let wire = ApiWire {
            protocol: std::env::var("SPOOL_P9V_PROTOCOL").unwrap_or_default(),
            temperature: std::env::var("SPOOL_P9V_TEMPERATURE").ok().and_then(|t| t.parse().ok()),
            max_output_tokens: None,
        };
        let request = sidecar_request(
            &env("SPOOL_P9V_BASE_URL"),
            &env("SPOOL_P9V_KEY"),
            &env("SPOOL_P9V_MODEL"),
            &system,
            &user,
            &std::env::var("SPOOL_P9V_REASONING").unwrap_or_default(),
            &wire,
            900,
        );
        let o = spawn_sidecar(&sidecar_path().unwrap(), serde_json::to_vec(&request).unwrap(), 900);
        report(&o, &packs);
        assert!(o.ok);
    }
}

// ---------------------------------------------------------------------------------------
// P10-5 —— 周回顾两条路真跑（任务书 §6.3，判定标准跑之前写死）。
//
// ⛔ 只对真库 `VACUUM INTO` 出来的副本跑：`SPOOL_DATA_DIR` 指着副本目录（里面有 spool.db 和一份
// settings.json），每一次的原始数据写进 `SPOOL_P10_OUT`。key 只走环境变量，⛔ 不写进任何文件。
// 发出去的东西和 app 一样：API 那条是 `weekly_messages_for_api` + DeepSeek 那一套参数；CLI 那条是
// `weekly_review_headless` + `engine::codex_args`，过的都是 `weekly_structured`。
//
// ⚠️ CLI 那条唯一和 app 不一样的地方：MCP 服务是 `SPOOL_P10_EXE`（这次构建的 `spool`）。
// `SPOOL_DATA_DIR` 怎么到 MCP 服务那里，走的是 app 自己那条路（P12-4，`engine::data_dir`）——
// P12-4 之前引擎只给 CLI 三个环境变量（`engine::run_env`），这里得自己插一行 `-c` 绕过去。
//
//     SPOOL_DATA_DIR=<副本> SPOOL_P10_OUT=<dir> SPOOL_P10_KEY=<key> SPOOL_P10_BASE=<url> \
//       SPOOL_P10_MODEL=<model> SPOOL_P10_REASONING=<low|''> SPOOL_P10_TEMP=<0.2|''> [SPOOL_P10_BALANCE=1] \
//       cargo test --lib real_api_weekly_on_a_copy -- --ignored --nocapture
//     （参数照 vendors.ts 里那一家填：DeepSeek = https://api.deepseek.com、low、0.2、有余额；
//       OpenAI = https://api.openai.com/v1、不发思考、不发温度、没有余额接口。）
//     SPOOL_DATA_DIR=<副本> SPOOL_P10_OUT=<dir> SPOOL_P10_EXE=<target/debug/spool> \
//       cargo test --lib real_cli_weekly_on_a_copy -- --ignored --nocapture
// ---------------------------------------------------------------------------------------
#[cfg(test)]
mod p10_real_runs {
    use super::*;

    fn env(k: &str) -> String {
        std::env::var(k).unwrap_or_else(|_| panic!("set {k}"))
    }

    fn copy_dir() -> String {
        let dir = env("SPOOL_DATA_DIR");
        assert!(!dir.contains("Application Support"), "real runs go against a copy, never the live library");
        dir
    }

    fn out_dir() -> std::path::PathBuf {
        let out = std::path::PathBuf::from(env("SPOOL_P10_OUT"));
        std::fs::create_dir_all(&out).unwrap();
        out
    }

    fn save(out: &std::path::Path, name: &str, text: &str) {
        std::fs::write(out.join(name), text).unwrap();
    }

    /// The gate's verdict, saved beside the raw reply — or the sentence the user would have seen.
    fn gate(out: &std::path::Path, raw: &str, material: &str, read_more: bool) {
        match crate::mcp::weekly_structured(raw, material, read_more) {
            Ok(json) => {
                let v: serde_json::Value = serde_json::from_str(&json).unwrap();
                save(out, "gated.json", &serde_json::to_string_pretty(&v).unwrap());
                println!(
                    "gate: {} projects, {} dropped",
                    v["projects"].as_array().map_or(0, Vec::len),
                    v["dropped"].as_array().map_or(0, Vec::len)
                );
            }
            Err(e) => {
                save(out, "gate-error.txt", &e);
                println!("gate: whole run fails — {e}");
            }
        }
    }

    /// Which models this key can use — the app picks from this list (vendors.ts `pickModel`).
    #[test]
    #[ignore = "lists a vendor's models with a real key; see the header"]
    fn real_api_models() {
        let out = out_dir();
        let request = serde_json::json!({
            "kind": "models", "protocol": "openai", "key_check_path": "",
            "base_url": env("SPOOL_P10_BASE"), "api_key": env("SPOOL_P10_KEY"),
            "model": "", "system": "", "user": "", "timeout_secs": 25u64,
        });
        let raw = run_balance_child(&sidecar_path().unwrap(), serde_json::to_vec(&request).unwrap()).unwrap();
        assert!(!raw.contains(&env("SPOOL_P10_KEY")));
        save(&out, "models.json", &raw);
        println!("models: {} chars", raw.len());
    }

    #[test]
    #[ignore = "real API weekly review against a library copy; see the header"]
    fn real_api_weekly_on_a_copy() {
        copy_dir();
        let out = out_dir();
        let key = env("SPOOL_P10_KEY");
        let bin = sidecar_path().unwrap();
        let base = env("SPOOL_P10_BASE");
        let base = base.as_str();
        let with_balance = std::env::var("SPOOL_P10_BALANCE").is_ok_and(|v| v == "1");
        let balance = |tag: &str| {
            if !with_balance {
                return;
            }
            let request = serde_json::json!({
                "kind": "balance", "base_url": base, "api_key": key,
                "model": "", "system": "", "user": "", "timeout_secs": 25u64,
            });
            let raw = run_balance_child(&bin, serde_json::to_vec(&request).unwrap()).unwrap();
            assert!(!raw.contains(&key));
            save(&out, &format!("balance-{tag}.json"), &raw);
            println!("balance {tag}: {raw}");
        };
        balance("before");
        let (digest, fresh, follow_ups) = crate::mcp::weekly_material_for_api(None).unwrap();
        let (system, user, quotable) = crate::mcp::weekly_messages_for_api(&digest, &fresh, &follow_ups);
        save(&out, "system.txt", &system);
        save(&out, "user.txt", &user);
        // The app's wire for that vendor (vendors.ts `wireFor`): openai protocol, no output cap, the
        // temperature only where the vendor takes one.
        let temperature = std::env::var("SPOOL_P10_TEMP").ok().and_then(|t| t.parse::<f64>().ok());
        let wire = ApiWire { protocol: "openai".into(), temperature, max_output_tokens: None };
        let model = env("SPOOL_P10_MODEL");
        let reasoning = std::env::var("SPOOL_P10_REASONING").unwrap_or_default();
        let request = sidecar_request(base, &key, &model, &system, &user, &reasoning, &wire, 600);
        let o = spawn_sidecar(&bin, serde_json::to_vec(&request).unwrap(), 600);
        let envelope = serde_json::to_string_pretty(&o).unwrap();
        assert!(!envelope.contains(&key));
        save(&out, "envelope.json", &envelope);
        save(&out, "raw.txt", &o.text);
        println!(
            "api: ok={} kind={:?} msg={:?} model={:?} ms={} in={} out={} cached={:?} reasoning={:?}",
            o.ok, o.kind, o.message, o.model, o.ms, o.input_tokens, o.output_tokens, o.cached_input_tokens, o.reasoning_tokens
        );
        balance("after");
        if o.ok {
            gate(&out, &o.text, &quotable, false);
        }
    }

    #[test]
    #[ignore = "real local Codex weekly review against a library copy; see the header"]
    fn real_cli_weekly_on_a_copy() {
        use std::io::Read;
        let dir = copy_dir();
        let out = out_dir();
        let exe = env("SPOOL_P10_EXE");
        let (prompt, digest) = crate::mcp::weekly_review_headless().unwrap();
        save(&out, "prompt.txt", &prompt);
        save(&out, "digest.txt", &digest);
        let status = crate::engine::detect(Some(crate::engine::EngineKind::Codex), None);
        let bin = status.path.expect("codex on this machine");
        let msg = out.join("final.txt");
        let _ = std::fs::remove_file(&msg);
        let args = crate::engine::codex_args(&prompt, &exe, &msg.to_string_lossy(), false, true, crate::engine::data_dir().as_deref());
        assert!(args.iter().any(|a| a.contains(&dir)), "the copy reaches Spool's server the app's way");
        let mut cmd = std::process::Command::new(&bin);
        cmd.args(&args).env_clear();
        for (k, v) in crate::engine::run_env(crate::engine::EngineKind::Codex, std::path::Path::new(&bin)) {
            cmd.env(k, v);
        }
        let started = std::time::Instant::now();
        let mut child = cmd
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();
        let mut events = String::new();
        child.stdout.take().unwrap().read_to_string(&mut events).unwrap();
        let mut stderr = String::new();
        child.stderr.take().unwrap().read_to_string(&mut stderr).unwrap();
        let code = child.wait().unwrap();
        save(&out, "events.jsonl", &events);
        save(&out, "stderr.txt", &stderr);
        let usage = crate::engine::parse_codex_usage(&events);
        let answer = std::fs::read_to_string(&msg).unwrap_or_default();
        println!(
            "cli: exit={code} ms={} usage={usage:?} answer {} chars, error={:?}",
            started.elapsed().as_millis(),
            answer.chars().count(),
            crate::engine::parse_codex_error(&events)
        );
        save(&out, "usage.json", &serde_json::to_string_pretty(&usage).unwrap());
        if !answer.is_empty() {
            gate(&out, &answer, &digest, true);
        }
    }
}
