# X POSTING GUIDELINES — CMO REFERENCE
*Source: twitter/the-algorithm (open-sourced), xAI Grok algorithm (Jan 2026)*
*Load this file BEFORE generating any weekly communication plan.*
*Last updated: 2026-03-09*

---

## 1. HOW THE ALGORITHM DECIDES WHAT GETS SEEN

X's For You feed runs a 4-stage pipeline:

1. **Candidate retrieval** — ~1,500 tweets pulled from in-network (people you follow) and out-of-network (people you don't). Out-of-network tweets get a 0.75x scale penalty vs in-network.
2. **Feature hydration** — ~6,000 ranking signals computed per tweet.
3. **Heavy Ranker ML scoring** — neural network predicts 10 probabilities: like, retweet, reply, click, media engage, relevance, dwell, negative engage, report, "see less."
4. **Visibility filtering** — safety labels, blocks, mutes, NSFW filters applied last.

The algorithm is NOT time-based, NOT follower-count-based. It is **engagement-depth and sentiment-based.**

---

## 2. ENGAGEMENT SIGNAL WEIGHTS — THE EXACT NUMBERS

| Signal | Weight | What it means for us |
|---|---|---|
| Reply that gets author reply | **+75** | A reply chain where WE respond is 75x more valuable than a like |
| Reply to tweet | **+13.5** | Provoking replies is the #1 goal |
| Profile visit + engagement | **+12** | Posts that make people click our profile |
| Click into conversation + engage | **+11** | Threading works — people click in, then engage |
| Dwell time (2+ min) | **+10** | Long-form that holds attention |
| Bookmark | **+10** | "Save for later" = strong silent signal |
| Retweet/Repost | **+1.0** | Surprisingly low — retweets are NOT king |
| Like | **+0.5** | Weakest signal. Likes are nearly worthless |
| Video watch 50%+ | **+0.005** | Video completion barely registers alone |

**The scoring formula simplified:**
Score = 0.5*P(Like) + 1.0*P(RT) + 0.3*P(Reply) + 0.15*P(ProfileClick) - 1.5*P(Report) - 3.0*P(Block)

### What this means for every post we write:
- **Optimize for REPLIES, not likes.** One genuine reply chain = 150 likes.
- **Always reply back to early commenters.** Author-engaged reply chains are the single highest-weighted signal (+75).
- **Bookmarks matter more than retweets.** Write content worth saving.
- **Likes are vanity.** Stop measuring success by like count.

---

## 3. PENALTY SIGNALS — WHAT KILLS REACH

| Signal | Penalty | Recovery time |
|---|---|---|
| Tweet report (spam/abuse) | **-369x** | Weeks to months |
| Block by viewer | **-74x** | Account-wide reputation damage |
| Mute / "show less" | **-74x** | Months of sustained positive engagement |
| External link in tweet | **-30-50% reach** | Per-tweet (structural) |
| Mass unfollows | **3-month shadowban** | ~90 days |
| Duplicate/copy-paste posts | Spam flag | Variable |
| All caps text | Penalty | Per-tweet |
| Offensive/combative tone | Grok AI downrank | Persistent |
| More than 2-3 hashtags | Dampening | Per-tweet |

### Hard rules for the CMO:
1. **NEVER include external links in the main tweet body.** Put links in the first reply instead.
2. **NEVER use more than 2 hashtags.** 3+ triggers dampening. 0-1 is optimal.
3. **NEVER copy-paste identical content across posts.** Rewrite with different angles.
4. **NEVER post combative, sarcastic, or negative-tone content.**
5. **NEVER use all caps** for emphasis.

---

## 4. BOOST SIGNALS — WHAT AMPLIFIES REACH

| Signal | Effect |
|---|---|
| X Premium verification | 2-4x visibility boost |
| Early engagement velocity (first 30 min) | Exponential amplification |
| Image/GIF attachments | Moderate boost (increases dwell time) |
| Thread format | Increases dwell time + reply surface area |
| Author replying to commenters | +75 per engaged reply chain |
| Positive/constructive sentiment | Grok AI elevates helpful content |

### Operational rules:
1. Post during audience peak hours — first 30-60 min determine lifetime reach.
2. Time decay is steep — every post has a ~24h window.
3. Always attach visual content when possible.
4. Use threads for complex ideas.
5. Reply to early comments within 30 minutes.

---

## 5. TWEEPCRED — ACCOUNT REPUTATION

- High follower-to-following ratio = TweepCred up
- Keep following count LOW — only follow accounts we genuinely interact with
- Never do follow-for-follow campaigns
- Engage with high-reputation accounts in our niche

---

## 6. SIMCLUSTERS — AUDIENCE TARGETING

X groups users into ~145,000 communities. Early engagers define which community sees our content.
- First engagers from developers -> tweet shown to more developers
- Stay on-topic: 80% niche content, 20% personality
- Never use engagement pods — they poison SimCluster targeting

---

## 7. POST FORMAT HIERARCHY

**Tier 1 — Maximum reach:**
- Thread with image on first tweet + conversation-provoking hook
- Poll with strong opinion prompt
- Hot take / contrarian insight that demands replies

**Tier 2 — Strong reach:**
- Single tweet with image + question at end
- Quote tweet with original analysis

**Tier 3 — Moderate reach:**
- Text-only tweet with strong hook
- Thread without images

**Tier 4 — Low reach (avoid):**
- Tweet with external link in body (-30-50% penalty)
- Tweet with 3+ hashtags
- Copy-pasted promotional content

---

## 8. POSTING CADENCE

| Rule | Rationale |
|---|---|
| 1-3 original posts per day | Algorithm penalizes spam patterns |
| Minimum 2h gap between posts | Posting too frequently cannibalizes reach |
| Reply to comments within 30 min | +75 weight signal |
| Max 1 thread per day | Too many threads = scroll fatigue |
| Best windows: 8-9am, 12-1pm, 5-7pm local | Maximize first-hour velocity |

---

## 9. CONTENT PRINCIPLES FOR INVOICA

- **Tone:** Professional but human. Builder-in-public energy. Never corporate-speak.
- **Topics:** Fintech pain points, automation wins, shipped features, lessons learned.
- **Hook patterns:** "We shipped [feature] this week. The result surprised us." / "Hot take: [contrarian fintech opinion]."
- **CTA style:** Questions, not commands. "What's your experience with X?" not "Sign up now."
- **Never:** Hype without substance. Show, don't tell.

---

## 10. WEEKLY PLAN REQUIREMENTS

The CMO MUST include in every weekly plan:
1. Schedule posts for audience peak hours (8-9am, 12-1pm, 5-7pm UTC)
2. 5-10 original posts across the week (1-2/day weekdays, 0-1 weekend)
3. At least 2 posts designed as "reply-bait" (questions, polls, contrarian takes)
4. At least 1 thread per week (deep-dive expertise content)
5. No external links in any main tweet body — links go in reply #1 only
6. 0-1 hashtags per tweet (never 3+)
7. Pre-select 5-10 niche accounts to notify when best content drops
8. Include 1 "build in public" post with real shipped metrics

---

## 11. MEASUREMENT — WHAT TO TRACK

**Primary (algorithm-aligned):**
- Reply count per post
- Author-engaged reply chains
- Bookmark count
- Profile visits driven by posts

**Secondary:**
- Retweet count
- Like count (vanity metric — lowest priority)
- Following-to-follower ratio (keep under 0.3)

**Kill switches:**
- 3+ posts in a row with 0 replies: stop posting, analyze what changed
- Following/follower ratio exceeds 0.5: unfollow until under 0.3
- Any post gets reported: investigate immediately

---

*Load this file BEFORE generating any weekly communication plan.*
