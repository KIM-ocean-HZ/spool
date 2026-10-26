// =============================================================================
// 周回顾二（P10，Ocean 2026-10-26）—— 模型回来的那一份 JSON
// =============================================================================
//
// 周回顾以前回的是一段文字（每个项目三行），页面再按 `## 项目名` 拆成卡片。P10 让两条路
// （API 一发、本机 CLI 带 MCP）都回同一个形状的 JSON：每个项目「做了什么 / 卡在哪 /
// 看到的信号 / 建议动作」，外加一句「接下来最该先做的」。这个文件只管把那一份读成数据。
//
// ⛔⛔ **读不成就整次失败，不退回显示半份**（任务书 §1、§3 P10-1）。API 那条被厂商掐断时
// `spool-ai` 早就报了失败（T3，`finish_reason = length`）；CLI 那条没有这个信号，
// **JSON 不完整就是被截断了** —— 所以这里只认一个完整的 JSON 对象，⛔ 不去「修」半截。
//
// ⚠️ 一个项目、一条信号、一条动作的格式不对（没写标题、动作不是那五种、缺字段），丢的是那一条，
// ⛔ 不是整次：整次失败只留给「根本读不成」。丢掉的连它说了什么一起带出去（`Dropped`）——
// 2026-08-23 Ocean 那句「不允许这样的情况发生」说的就是只给一个数、不给内容。
//
// ⛔ Spool 绝不自己截字：每个字段原样留着，提示词里的字数上限只是对模型的要求。

use serde::Serialize;
use serde_json::Value;

/// 存进 `engine_runs.result_text` 时的记号 —— 前端靠它分辨「结构化的」和「以前那种一段文字」。
pub const FORMAT: &str = "spool-weekly-1";

/// 建议动作只有这几种（任务书 §1：Spool 已有的那四件，取代 / 更正是第四件的两种说法）。
/// ⛔ 不加新的种类。
pub const ACTION_KINDS: [&str; 5] = ["mark_done", "set_deadline", "add_follow_up", "propose_supersede", "correct"];

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub format: &'static str,
    pub projects: Vec<Project>,
    /// 接下来最该先做的那一件事。模型没写就是空串。
    pub next: String,
    /// 没放上来的那几条，连内容一起。
    pub dropped: Vec<Dropped>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// 模型写的标题，原样。
    pub title: String,
    /// 对上的那个项目（P10-2 填）。`None` = 还没对过。
    pub thread_id: Option<String>,
    pub did: String,
    pub stuck: String,
    pub signals: Vec<Signal>,
    pub actions: Vec<Action>,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Signal {
    /// ⛔ 一个字符都不动（首尾空白也算）—— 逐字闸认的就是这一串。
    pub quote: String,
    pub why: String,
    /// 引文只差标点（P10-2 填）。界面要说出来。
    pub retyped: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    /// `ACTION_KINDS` 里的一个。
    pub kind: String,
    pub why: String,
    /// 标完成 / 改截止日期 / 加跟进行的依据。取代 / 更正没有这一项（两句引文就是依据）。
    pub quote: Option<String>,
    /// `set_deadline`：YYYY-MM-DD。
    pub date: Option<String>,
    /// `add_follow_up`：那一条跟进问题。
    pub text: Option<String>,
    /// `propose_supersede` / `correct`。
    pub old_quote: Option<String>,
    pub new_quote: Option<String>,
    /// 取代 / 更正对上的两块（P10-2 填）。
    pub stale_block_id: Option<String>,
    pub by_block_id: Option<String>,
    pub retyped: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Dropped {
    /// 它属于哪个项目（模型写的标题；整项丢掉时就是那一项的标题）。
    pub project: String,
    /// `project` / `signal` / `action`。
    pub what: &'static str,
    /// 为什么没放上来。⚠️ 界面按它挑话说。
    pub reason: &'static str,
    /// 模型原来写的那一条。
    pub item: Value,
}

/// 整次读不成的两种。
#[derive(Debug, PartialEq, Eq)]
pub enum ParseError {
    /// 找不到一个完整的 JSON 对象 —— 多半是被截断了，或者回的根本不是 JSON。
    NotJson,
    /// 是 JSON，但没有 `projects` 数组。
    NoProjects,
}

/// 从模型那一段输出里找出那一个 JSON 对象。
///
/// ⚠️ 提示词说了前后不加字、不加代码块标记，但一个只在模型守规矩时才读得出来的解析器，等于把守规矩
/// 当成了前提 —— 所以前面有一句话、有 ```json 都行。⛔ 但对象本身必须完整：从每一个 `{` 起试着读
/// **一个完整的值**，读到的必须是带 `projects` 的那一个。半截的外层对象读不完，里面某个完整的小对象
/// 又没有 `projects`，所以截断的回答一定读不成。
fn root_object(text: &str) -> Option<serde_json::Map<String, Value>> {
    for (at, _) in text.match_indices('{') {
        let mut values = serde_json::Deserializer::from_str(&text[at..]).into_iter::<Value>();
        if let Some(Ok(Value::Object(map))) = values.next() {
            if map.contains_key("projects") {
                return Some(map);
            }
        }
    }
    None
}

/// 给人读的字段（做了什么、为什么……）去掉首尾空白；不是字符串就当没写。
fn prose(v: &Value, key: &str) -> String {
    v.get(key).and_then(Value::as_str).map(str::trim).unwrap_or_default().to_string()
}

/// 引文：⛔ 原样，一个字符都不动。空串当没写。
fn quote_of(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(Value::as_str).filter(|s| !s.is_empty()).map(str::to_string)
}

/// YYYY-MM-DD，而且这一天真的存在。
pub fn valid_date(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    let num = |r: std::ops::Range<usize>| s.get(r).filter(|p| p.bytes().all(|c| c.is_ascii_digit())).and_then(|p| p.parse::<u32>().ok());
    let (Some(y), Some(m), Some(d)) = (num(0..4), num(5..7), num(8..10)) else {
        return false;
    };
    let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let days = match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return false,
    };
    (1..=days).contains(&d)
}

/// 一条动作。`Err(reason)` = 格式不对，整条丢。
fn action_of(v: &Value) -> Result<Action, &'static str> {
    let kind = v.get("kind").and_then(Value::as_str).unwrap_or_default();
    if !ACTION_KINDS.contains(&kind) {
        return Err("unknown_kind");
    }
    let mut a = Action {
        kind: kind.to_string(),
        why: prose(v, "why"),
        quote: None,
        date: None,
        text: None,
        old_quote: None,
        new_quote: None,
        stale_block_id: None,
        by_block_id: None,
        retyped: false,
    };
    match kind {
        "propose_supersede" | "correct" => {
            a.old_quote = quote_of(v, "old_quote");
            a.new_quote = quote_of(v, "new_quote");
            if a.old_quote.is_none() || a.new_quote.is_none() {
                return Err("missing_field");
            }
            // 待审卡上那一行就是它，用户要凭它判断（和 `propose_supersede` 同一条）。
            if a.why.is_empty() {
                return Err("missing_field");
            }
        }
        _ => {
            a.quote = quote_of(v, "quote");
            if a.quote.is_none() {
                return Err("missing_field");
            }
            if kind == "set_deadline" {
                let date = prose(v, "date");
                if !valid_date(&date) {
                    return Err("bad_date");
                }
                a.date = Some(date);
            }
            if kind == "add_follow_up" {
                let text = prose(v, "text");
                if text.is_empty() {
                    return Err("missing_field");
                }
                a.text = Some(text);
            }
        }
    }
    Ok(a)
}

/// 读成数据。格式不对的那几条进 `dropped`；整份读不成才是 `Err`。
pub fn parse(raw: &str) -> Result<Review, ParseError> {
    let root = root_object(raw).ok_or(ParseError::NotJson)?;
    let list = root.get("projects").and_then(Value::as_array).ok_or(ParseError::NoProjects)?;
    let mut projects = Vec::new();
    let mut dropped = Vec::new();
    for p in list {
        let title = prose(p, "title");
        if title.is_empty() {
            dropped.push(Dropped { project: String::new(), what: "project", reason: "no_title", item: p.clone() });
            continue;
        }
        let items = |key: &str| p.get(key).and_then(Value::as_array).cloned().unwrap_or_default();
        let mut signals = Vec::new();
        for s in items("signals") {
            match quote_of(&s, "quote") {
                Some(quote) => signals.push(Signal { quote, why: prose(&s, "why"), retyped: false }),
                None => dropped.push(Dropped { project: title.clone(), what: "signal", reason: "missing_field", item: s }),
            }
        }
        let mut actions = Vec::new();
        for a in items("actions") {
            match action_of(&a) {
                Ok(action) => actions.push(action),
                Err(reason) => dropped.push(Dropped { project: title.clone(), what: "action", reason, item: a }),
            }
        }
        projects.push(Project {
            did: prose(p, "did"),
            stuck: prose(p, "stuck"),
            title,
            thread_id: None,
            signals,
            actions,
        });
    }
    Ok(Review { format: FORMAT, projects, next: prose(&Value::Object(root), "next"), dropped })
}

#[cfg(test)]
mod tests {
    use super::*;

    const GOOD: &str = r#"{"projects":[{"title":"申请规划","did":"写完了文书初稿","stuck":"推荐信还没人答应",
        "signals":[{"quote":"文书初稿写完了","why":"主线推进了"}],
        "actions":[{"kind":"set_deadline","date":"2026-11-30","quote":"截止改到 11 月 30 日","why":"学校改了日期"},
                   {"kind":"add_follow_up","text":"推荐人回没回","quote":"推荐信还没人答应","why":"卡在这"}]}],
        "next":"先找推荐人。"}"#;

    #[test]
    fn a_whole_answer_reads_into_data() {
        let r = parse(GOOD).unwrap();
        assert_eq!(r.format, FORMAT);
        assert_eq!(r.projects.len(), 1);
        let p = &r.projects[0];
        assert_eq!(p.title, "申请规划");
        assert_eq!(p.signals[0].quote, "文书初稿写完了");
        assert_eq!(p.actions.len(), 2);
        assert_eq!(p.actions[0].date.as_deref(), Some("2026-11-30"));
        assert_eq!(p.actions[1].text.as_deref(), Some("推荐人回没回"));
        assert_eq!(r.next, "先找推荐人。");
        assert!(r.dropped.is_empty());
    }

    // 提示词说了前后不加字，但模型多说一句、套个代码块，都不该让一份完整的回答作废。
    #[test]
    fn a_sentence_or_a_fence_around_it_is_fine() {
        let fenced = format!("好的，下面是回顾：\n```json\n{GOOD}\n```\n");
        assert_eq!(parse(&fenced).unwrap(), parse(GOOD).unwrap());
    }

    // ⛔⛔ CLI 那条没有 finish_reason：JSON 不完整 = 截断 = 整次失败。从任何一处掐断都不许读出半份。
    #[test]
    fn a_cut_off_answer_never_reads() {
        let chars: Vec<char> = GOOD.chars().collect();
        for n in 0..chars.len() - 1 {
            let cut: String = chars[..n].iter().collect();
            assert!(parse(&cut).is_err(), "读出了半份：{cut}");
        }
        assert_eq!(parse("这周没什么可说的。"), Err(ParseError::NotJson));
        assert_eq!(parse(r#"{"next":"x"}"#), Err(ParseError::NotJson));
        assert_eq!(parse(r#"{"projects":"x"}"#), Err(ParseError::NoProjects));
    }

    // 格式不对丢一条，不丢整次；丢的那条连内容一起带出去。
    #[test]
    fn a_bad_item_drops_alone_and_keeps_what_it_said() {
        let raw = r#"{"projects":[
            {"did":"没标题"},
            {"title":"A","signals":[{"why":"没引文"}],
             "actions":[{"kind":"delete_project","quote":"x","why":"y"},
                        {"kind":"set_deadline","date":"2026-02-30","quote":"x","why":"y"},
                        {"kind":"set_deadline","date":"11月30日","quote":"x","why":"y"},
                        {"kind":"add_follow_up","quote":"x","why":"y"},
                        {"kind":"mark_done","why":"y"},
                        {"kind":"correct","old_quote":"旧","new_quote":"新"},
                        {"kind":"propose_supersede","old_quote":"旧","new_quote":"新","why":"换了"},
                        {"kind":"mark_done","quote":"做完了","why":""}]}],
            "next":"x"}"#;
        let r = parse(raw).unwrap();
        assert_eq!(r.projects.len(), 1);
        let reasons: Vec<(&str, &str)> = r.dropped.iter().map(|d| (d.what, d.reason)).collect();
        assert_eq!(
            reasons,
            vec![
                ("project", "no_title"),
                ("signal", "missing_field"),
                ("action", "unknown_kind"),
                ("action", "bad_date"),
                ("action", "bad_date"),
                ("action", "missing_field"),
                ("action", "missing_field"),
                ("action", "missing_field"),
            ]
        );
        assert_eq!(r.dropped[2].item["kind"], "delete_project");
        let kinds: Vec<&str> = r.projects[0].actions.iter().map(|a| a.kind.as_str()).collect();
        assert_eq!(kinds, vec!["propose_supersede", "mark_done"]);
    }

    // ⛔ 引文一个字符都不动（首尾空白也算）；给人读的字段才去空白。⛔ 也不截字。
    #[test]
    fn quotes_stay_byte_for_byte_and_nothing_is_cut() {
        let long = "很长".repeat(400);
        let raw = format!(
            r#"{{"projects":[{{"title":"  A  ","did":"{long}","signals":[{{"quote":"  原句 ","why":"  因为 "}}]}}],"next":" 先做 "}}"#
        );
        let r = parse(&raw).unwrap();
        let p = &r.projects[0];
        assert_eq!(p.title, "A");
        assert_eq!(p.did, long);
        assert_eq!(p.signals[0].quote, "  原句 ");
        assert_eq!(p.signals[0].why, "因为");
        assert_eq!(r.next, "先做");
    }

    #[test]
    fn dates_are_real_days() {
        for ok in ["2026-11-30", "2028-02-29", "2000-02-29"] {
            assert!(valid_date(ok), "{ok}");
        }
        for bad in ["2026-02-29", "1900-02-29", "2026-13-01", "2026-00-10", "2026-1-01", "2026/11/30", "", "２０２６-11-30"] {
            assert!(!valid_date(bad), "{bad}");
        }
    }
}
