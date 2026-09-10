# Automatic channel verification

Opening a real customer assessment checks its website and public accounts if the saved result is older than seven days or the website changed. Restricted or partial reads retry on a later page opening after one hour. No background schedule is created. `/api/verify-channels` requires the workspace session. It reads up to three initial website pages, three linked business-tool pages, and up to two official links per supported social platform. Email and WhatsApp publication are checked without sending messages.

Results distinguish official website association, page readability, contact delivery (not tested), and maturity. Missing links and blocked pages remain unknown. Share buttons are excluded. JSON-LD publication dates must be attributable to the requested page or account; copyright and generic modification dates are ignored. Two attributable publications within 30 days can support activity; an old article never proves inactivity. A purple website rating requires identity metadata and successful reads of catalog, contact, ordering and policy destinations. Team size and purchasing intent are not inferred.

Results and excerpts are merged into the current customer and persisted through the normal database save flow. Manual ratings remain unchanged. Social content behind login walls is not bypassed; the UI exposes that limitation. This is public-page verification, not authenticated social API access or guaranteed deliverability testing.


## Browser fallback

Cloudflare Browser Run is configured through `BROWSER`. Failed or JavaScript-dependent reads fall back to a normal browser session, with at most three rendered pages per scan. A single session is reused and closed in finally. Images/media/fonts are skipped. No login cookies, CAPTCHA handling, proxy rotation or bot-identity spoofing is implemented. Login/challenge pages remain unverified. Read attempts and final failure reasons are retained. Two public post links from a discovered profile may be read; dates must match the originating author.

Fixed a false positive where a hidden WordPress form warning (Please enable JavaScript) caused a content-rich business site to be treated as inaccessible. Sparse JavaScript/login shells remain rejected. Placeholder email links are excluded.

The installed browser package has an advisory in its development archive-extraction dependency; archive downloads/extraction are not used by this Worker. Do not feed untrusted archives to development tools.
