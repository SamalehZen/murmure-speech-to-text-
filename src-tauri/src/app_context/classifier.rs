use super::types::{ActiveWindowInfo, AppCategory};

pub fn classify_app(info: &ActiveWindowInfo) -> AppCategory {
    if let Some(ref url) = info.url {
        if let Some(category) = classify_by_url(url) {
            return category;
        }
    }

    if let Some(ref bundle_id) = info.bundle_id {
        if let Some(category) = classify_by_bundle_id(bundle_id) {
            return category;
        }
    }

    if let Some(category) = classify_by_process_name(&info.process_name) {
        return category;
    }

    if let Some(category) = classify_by_window_title(&info.window_title) {
        return category;
    }

    AppCategory::Default
}

fn classify_by_url(url: &str) -> Option<AppCategory> {
    let url_lower = url.to_lowercase();

    let email_patterns = [
        "mail.google.com", "gmail.com", "outlook.live.com", "outlook.office",
        "outlook.com", "mail.yahoo.com", "mail.proton.me", "protonmail.com",
        "fastmail.com", "hey.com", "superhuman.com", "mail.zoho.com",
        "aol.com/mail", "icloud.com/mail", "mail.tutanota.com", "mailbox.org",
        "mail.com", "gmx.com", "yandex.com/mail", "mail.ru",
        "roundcube", "webmail", "zimbra", "horde"
    ];
    if email_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Email);
    }

    let chat_patterns = [
        "slack.com", "discord.com", "teams.microsoft.com", "teams.live.com",
        "web.whatsapp.com", "messenger.com", "telegram.org", "web.telegram.org",
        "chat.openai.com", "chatgpt.com", "claude.ai", "anthropic.com",
        "messages.google.com", "meet.google.com", "zoom.us", "webex.com",
        "skype.com", "signal.org", "wire.com", "element.io",
        "matrix.org", "rocket.chat", "mattermost", "zulip", "gitter.im",
        "intercom.com", "crisp.chat", "tawk.to", "drift.com", "zendesk.com",
        "bard.google.com", "gemini.google.com", "perplexity.ai", "poe.com",
        "you.com", "phind.com", "character.ai", "replika.ai", "pi.ai"
    ];
    if chat_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Chat);
    }

    let notes_patterns = [
        "notion.so", "notion.site", "docs.google.com", "drive.google.com",
        "roamresearch.com", "obsidian.md", "coda.io", "evernote.com",
        "onenote.com", "bear.app", "craft.do", "workflowy.com",
        "dynalist.io", "remnote.com", "logseq.com", "tana.inc",
        "capacities.io", "anytype.io", "mem.ai", "reflect.app",
        "dropbox.com/paper", "quip.com", "slite.com", "nuclino.com",
        "basecamp.com", "monday.com", "asana.com", "clickup.com"
    ];
    if notes_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Notes);
    }

    let code_patterns = [
        "github.com", "gitlab.com", "bitbucket.org", "codepen.io",
        "codesandbox.io", "replit.com", "stackblitz.com", "jsfiddle.net",
        "codeberg.org", "sourcehut.org", "gitea", "gogs",
        "stackoverflow.com", "stackexchange.com", "dev.to", "hashnode.com",
        "medium.com/programming", "hackernoon.com", "codeproject.com",
        "leetcode.com", "hackerrank.com", "codewars.com", "exercism.org",
        "kaggle.com", "colab.research.google.com", "jupyter", "deepnote.com",
        "vercel.com", "netlify.com", "heroku.com", "railway.app",
        "render.com", "fly.io", "aws.amazon.com", "console.cloud.google.com",
        "portal.azure.com", "digitalocean.com", "linode.com"
    ];
    if code_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Code);
    }

    let social_patterns = [
        "twitter.com", "x.com", "facebook.com", "instagram.com",
        "linkedin.com", "reddit.com", "tiktok.com", "pinterest.com",
        "tumblr.com", "threads.net", "mastodon", "bsky.app",
        "bluesky.social", "cohost.org", "hive.social", "post.news",
        "substack.com", "medium.com", "beehiiv.com", "ghost.io",
        "quora.com", "producthunt.com", "indiegogo.com", "kickstarter.com",
        "twitch.tv", "snapchat.com", "weibo.com", "vk.com"
    ];
    if social_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Social);
    }

    let video_patterns = [
        "youtube.com", "youtu.be", "vimeo.com", "dailymotion.com",
        "netflix.com", "hulu.com", "disneyplus.com", "hbomax.com",
        "primevideo.com", "amazon.com/video", "peacocktv.com", "paramountplus.com",
        "appletv.apple.com", "crunchyroll.com", "funimation.com",
        "bilibili.com", "niconico", "rumble.com", "bitchute.com",
        "odysee.com", "lbry.tv", "peertube", "floatplane.com"
    ];
    if video_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Video);
    }

    let music_patterns = [
        "spotify.com", "music.apple.com", "music.youtube.com",
        "soundcloud.com", "deezer.com", "tidal.com", "pandora.com",
        "bandcamp.com", "last.fm", "audiomack.com", "mixcloud.com",
        "music.amazon.com", "qobuz.com", "beatport.com"
    ];
    if music_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Music);
    }

    let office_patterns = [
        "docs.google.com/document", "docs.google.com/spreadsheets",
        "docs.google.com/presentation", "sheets.google.com", "slides.google.com",
        "word.office.com", "excel.office.com", "powerpoint.office.com",
        "office.com", "office365.com", "sharepoint.com", "onedrive.com",
        "airtable.com", "smartsheet.com", "zoho.com/sheet", "zoho.com/docs"
    ];
    if office_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Office);
    }

    let design_patterns = [
        "figma.com", "sketch.com", "canva.com", "adobe.com",
        "invisionapp.com", "zeplin.io", "framer.com", "webflow.com",
        "dribbble.com", "behance.net", "awwwards.com", "unsplash.com",
        "pexels.com", "pixabay.com", "freepik.com", "shutterstock.com",
        "miro.com", "whimsical.com", "lucidchart.com", "diagrams.net",
        "excalidraw.com", "tldraw.com"
    ];
    if design_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Design);
    }

    let finance_patterns = [
        "chase.com", "bankofamerica.com", "wellsfargo.com", "citi.com",
        "capitalone.com", "discover.com", "americanexpress.com",
        "paypal.com", "venmo.com", "cash.app", "wise.com",
        "robinhood.com", "etrade.com", "schwab.com", "fidelity.com",
        "vanguard.com", "tdameritrade.com", "coinbase.com", "binance.com",
        "kraken.com", "gemini.com", "blockchain.com", "crypto.com",
        "mint.com", "personalcapital.com", "ynab.com", "quickbooks.com",
        "stripe.com", "square.com", "plaid.com"
    ];
    if finance_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Finance);
    }

    let calendar_patterns = [
        "calendar.google.com", "outlook.live.com/calendar", "outlook.office.com/calendar",
        "calendar.yahoo.com", "calendly.com", "doodle.com", "cal.com",
        "savvycal.com", "tidycal.com", "acuityscheduling.com"
    ];
    if calendar_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Calendar);
    }

    let productivity_patterns = [
        "trello.com", "todoist.com", "ticktick.com", "things.app",
        "omnifocus.com", "habitica.com", "focusmate.com", "forest-app.cc",
        "toggl.com", "clockify.me", "harvest.com", "rescuetime.com",
        "1password.com", "lastpass.com", "bitwarden.com", "dashlane.com",
        "zapier.com", "ifttt.com", "make.com", "n8n.io"
    ];
    if productivity_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Productivity);
    }

    let writing_patterns = [
        "grammarly.com", "hemingwayapp.com", "writersonic.com",
        "jasper.ai", "copy.ai", "rytr.me", "sudowrite.com",
        "novelai.net", "shortlyai.com", "wordtune.com", "quillbot.com",
        "languagetool.org", "prowritingaid.com", "scrivener"
    ];
    if writing_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Writing);
    }

    let translation_patterns = [
        "translate.google.com", "deepl.com", "bing.com/translator",
        "reverso.net", "linguee.com", "wordreference.com", "dict.cc",
        "papago.naver.com", "yandex.com/translate"
    ];
    if translation_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Translation);
    }

    let search_patterns = [
        "google.com/search", "bing.com/search", "duckduckgo.com",
        "search.yahoo.com", "ecosia.org", "startpage.com", "qwant.com",
        "brave.com/search", "neeva.com", "kagi.com", "yandex.com/search",
        "baidu.com"
    ];
    if search_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Search);
    }

    let shopping_patterns = [
        "amazon.com", "amazon.", "ebay.com", "walmart.com", "target.com",
        "bestbuy.com", "costco.com", "homedepot.com", "lowes.com",
        "etsy.com", "aliexpress.com", "alibaba.com", "wish.com",
        "shopify.com", "woocommerce", "magento", "bigcommerce.com",
        "rakuten.com", "newegg.com", "wayfair.com", "overstock.com"
    ];
    if shopping_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Shopping);
    }

    let travel_patterns = [
        "booking.com", "airbnb.com", "expedia.com", "hotels.com",
        "tripadvisor.com", "kayak.com", "skyscanner.com", "priceline.com",
        "google.com/travel", "google.com/flights", "maps.google.com",
        "google.com/maps", "uber.com", "lyft.com", "grab.com"
    ];
    if travel_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Travel);
    }

    let news_patterns = [
        "news.google.com", "cnn.com", "bbc.com", "nytimes.com",
        "wsj.com", "washingtonpost.com", "theguardian.com", "reuters.com",
        "apnews.com", "bloomberg.com", "forbes.com", "businessinsider.com",
        "techcrunch.com", "theverge.com", "wired.com", "arstechnica.com",
        "engadget.com", "gizmodo.com", "mashable.com", "cnet.com",
        "news.ycombinator.com", "slashdot.org"
    ];
    if news_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::News);
    }

    let education_patterns = [
        "coursera.org", "udemy.com", "edx.org", "skillshare.com",
        "linkedin.com/learning", "udacity.com", "khanacademy.org",
        "brilliant.org", "duolingo.com", "memrise.com", "anki",
        "quizlet.com", "chegg.com", "blackboard.com", "canvas",
        "moodle", "schoology.com", "classdojo.com"
    ];
    if education_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Education);
    }

    let health_patterns = [
        "myfitnesspal.com", "fitbit.com", "strava.com", "peloton.com",
        "headspace.com", "calm.com", "noom.com", "teladoc.com",
        "zocdoc.com", "webmd.com", "mayoclinic.org", "healthline.com"
    ];
    if health_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Health);
    }

    let gaming_patterns = [
        "steam", "store.steampowered.com", "epicgames.com", "gog.com",
        "itch.io", "roblox.com", "minecraft.net", "playstation.com",
        "xbox.com", "nintendo.com", "blizzard.com", "ea.com",
        "ubisoft.com", "rockstargames.com", "bethesda.net"
    ];
    if gaming_patterns.iter().any(|p| url_lower.contains(p)) {
        return Some(AppCategory::Gaming);
    }

    None
}

fn classify_by_bundle_id(bundle_id: &str) -> Option<AppCategory> {
    let bundle_lower = bundle_id.to_lowercase();

    let email_bundles = [
        "com.apple.mail", "com.microsoft.outlook", "com.google.gmail",
        "com.readdle.smartemail", "com.superhuman.superhuman",
        "com.readdle.spark", "com.freron.mailmate", "com.postbox-inc.postbox",
        "com.mozilla.thunderbird", "it.bloop.airmail2"
    ];
    if email_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Email);
    }

    let chat_bundles = [
        "com.tinyspeck.slackmacgap", "com.discord", "com.microsoft.teams",
        "com.facebook.archon", "ru.keepcoder.telegram", "com.hnc.discord",
        "org.whispersystems.signal", "com.wire.wire", "im.riot.app",
        "com.skype.skype", "us.zoom.xos", "com.webex.meetingmanager",
        "com.openai.chat"
    ];
    if chat_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Chat);
    }

    let notes_bundles = [
        "com.apple.notes", "notion.id", "com.microsoft.onenote",
        "com.evernote.evernote", "md.obsidian", "com.agiletortoise.drafts",
        "com.ulysses", "net.shinyfrog.bear", "com.logseq.logseq",
        "com.craft.craft", "com.workflowy.workflowy"
    ];
    if notes_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Notes);
    }

    let code_bundles = [
        "com.microsoft.vscode", "com.sublimetext", "com.jetbrains",
        "com.apple.dt.xcode", "com.github.atom", "com.panic.nova",
        "com.barebones.bbedit", "abnerworks.typora", "com.macromates.textmate",
        "com.vim", "org.vim.macvim", "org.gnu.emacs"
    ];
    if code_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Code);
    }

    let browser_bundles = [
        "com.apple.safari", "com.google.chrome", "org.mozilla.firefox",
        "com.brave.browser", "com.microsoft.edge", "com.operasoftware.opera",
        "com.vivaldi.vivaldi", "company.thebrowser.browser", "org.chromium.chromium"
    ];
    if browser_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Browser);
    }

    let terminal_bundles = [
        "com.apple.terminal", "com.googlecode.iterm2", "dev.warp.warp",
        "co.zeit.hyper", "com.github.alacritty", "net.kovidgoyal.kitty"
    ];
    if terminal_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Terminal);
    }

    let office_bundles = [
        "com.microsoft.word", "com.microsoft.excel", "com.microsoft.powerpoint",
        "com.apple.iwork.pages", "com.apple.iwork.numbers", "com.apple.iwork.keynote",
        "com.google.docs", "org.libreoffice"
    ];
    if office_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Office);
    }

    let design_bundles = [
        "com.figma.desktop", "com.bohemiancoding.sketch3", "com.adobe.photoshop",
        "com.adobe.illustrator", "com.adobe.xd", "com.adobe.indesign",
        "com.adobe.aftereffects", "com.adobe.premiere", "com.blackmagic-design.davinciresolve"
    ];
    if design_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Design);
    }

    let video_bundles = [
        "com.apple.quicktimeplayer", "org.videolan.vlc", "io.mpv",
        "com.colliderli.iina", "com.netflix.netflix", "com.spotify.client"
    ];
    if video_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Video);
    }

    let music_bundles = [
        "com.apple.music", "com.spotify.client", "com.apple.logic10",
        "com.ableton.live", "com.native-instruments", "com.image-line.flstudio"
    ];
    if music_bundles.iter().any(|b| bundle_lower.contains(b)) {
        return Some(AppCategory::Music);
    }

    None
}

fn classify_by_process_name(process_name: &str) -> Option<AppCategory> {
    let name_lower = process_name.to_lowercase();
    let name_clean = name_lower
        .strip_suffix(".exe")
        .unwrap_or(&name_lower);

    match name_clean {
        "outlook" | "thunderbird" | "mailspring" | "mail" | "spark" => Some(AppCategory::Email),
        "slack" | "discord" | "teams" | "telegram" | "whatsapp" | "signal" 
        | "zoom" | "skype" | "webex" => Some(AppCategory::Chat),
        "notion" | "onenote" | "evernote" | "obsidian" | "bear" | "logseq" 
        | "roam" | "craft" => Some(AppCategory::Notes),
        "code" | "vscode" | "devenv" | "idea64" | "idea" | "pycharm64" | "pycharm"
        | "webstorm64" | "webstorm" | "goland64" | "goland" | "clion64" | "clion"
        | "rider64" | "rider" | "sublime_text" | "atom" | "nova" | "xcode" => Some(AppCategory::Code),
        "chrome" | "firefox" | "msedge" | "safari" | "brave" | "opera" 
        | "vivaldi" | "arc" => Some(AppCategory::Browser),
        "terminal" | "iterm2" | "warp" | "hyper" | "alacritty" | "kitty" 
        | "windowsterminal" | "cmd" | "powershell" | "pwsh" => Some(AppCategory::Terminal),
        "winword" | "excel" | "powerpnt" | "word" | "pages" | "numbers" 
        | "keynote" | "libreoffice" | "soffice" => Some(AppCategory::Office),
        "figma" | "sketch" | "photoshop" | "illustrator" | "xd" | "indesign"
        | "afterfx" | "premiere" | "davinci" => Some(AppCategory::Design),
        "vlc" | "mpv" | "iina" | "quicktime" | "netflix" => Some(AppCategory::Video),
        "spotify" | "music" | "itunes" | "logic" | "ableton" | "flstudio" => Some(AppCategory::Music),
        _ => None
    }
}

fn classify_by_window_title(title: &str) -> Option<AppCategory> {
    let title_lower = title.to_lowercase();

    if title_lower.contains("gmail") || title_lower.contains("outlook") 
       || title_lower.contains("inbox") || title_lower.contains(" mail") {
        return Some(AppCategory::Email);
    }

    if title_lower.contains("slack") || title_lower.contains("discord")
       || title_lower.contains("teams") || title_lower.contains("whatsapp")
       || title_lower.contains("telegram") || title_lower.contains("chatgpt")
       || title_lower.contains("claude") || title_lower.contains("messenger") {
        return Some(AppCategory::Chat);
    }

    if title_lower.contains("notion") || title_lower.contains("notes")
       || title_lower.contains("obsidian") || title_lower.contains("evernote") {
        return Some(AppCategory::Notes);
    }

    if title_lower.contains("visual studio") || title_lower.contains("vs code")
       || title_lower.contains("github") || title_lower.contains("gitlab")
       || title_lower.ends_with(".rs") || title_lower.ends_with(".ts")
       || title_lower.ends_with(".py") || title_lower.ends_with(".js")
       || title_lower.ends_with(".go") || title_lower.ends_with(".java") {
        return Some(AppCategory::Code);
    }

    None
}
