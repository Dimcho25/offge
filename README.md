# ქვიზო: a quiz site with a free admin panel

A Georgian quiz and article website in the style of BuzzFeed. You manage it from an admin panel in your browser (**Pages CMS**), and it's hosted for free on **GitHub Pages**.

```
Pages CMS (forms in your browser)  →  Save  →  GitHub  →  site rebuilds itself  →  live in ~1 minute
```

There is no HTML to touch and no files to download or upload. You log in, edit and press **Save**.

---

## One-time setup (about 15 minutes, all free)

### 1. Put the site on GitHub
1. Create a free account at **github.com**.
2. Click **+ → New repository**. Name it `kvizo`, choose **Public**, and click **Create repository**.
3. Click **uploading an existing file**.
   - In Finder, open this `website` folder and press **⌘ + Shift + .** to show hidden files. The `.github` folder and the `.pages.yml` file must go too.
   - Select everything (⌘ + A), drag it into GitHub and click **Commit changes**.
4. Check that your repository shows `.github` and `.pages.yml`. If one is missing, click **Add file → Create new file**, type its exact name (`.pages.yml` or `.github/workflows/deploy.yml`), paste the contents from this folder, and commit.

### 2. Turn on the free hosting
1. In the repository, go to **Settings → Pages**. Under *Source*, choose **GitHub Actions**.
2. Open the **Actions** tab. When "Publish site" turns green, the site is live at `https://YOUR-USERNAME.github.io/kvizo/`.

### 3. Connect the admin panel
1. Go to **app.pagescms.org** and click **Sign in with GitHub**.
2. When asked, install the Pages CMS GitHub app. Give it access to your `kvizo` repository only.
3. Open the `kvizo` repository. The menu shows **Quizzes, Articles, Categories** and **Site settings**.
4. In **Site settings**, set **Website address** to `https://YOUR-USERNAME.github.io/kvizo`, upload your **Logo**, and click **Save**. The address makes Facebook previews show the right picture.

Bookmark **app.pagescms.org**. That's your admin panel from now on, on any computer or phone.

---

## Everyday use

### Add a quiz
1. **Quizzes → Add an entry.**
2. Fill in the headline, description, type, category and cover picture. Drop pictures straight onto the picture fields.
3. **Results:** add 2 or more ("Result 1", "Result 2"…).
4. **Questions:** add questions, and 2 or more answers each.
   - **Personality quiz:** for each answer, choose which result it **counts toward** (Result 1, 2…). The most-picked result wins.
   - **Trivia quiz:** tick **this is the correct answer** on exactly one answer per question. You can add text that shows after answering. Give each result a starting score, for example Result 1 from 0, Result 2 from 3 and Result 3 from 6 correct.
   - Give **every** answer in a question a picture, and the answers show as picture tiles.
5. **Save.** About a minute later the quiz has its own page, and appears on the homepage, in its category and in search.

### Add an article
**Articles → Add an entry.** Build the content from blocks: **Paragraph, Numbered list item, Subheading, Picture, Quote**. List items are numbered automatically. In text you can write `**bold**`, `*italic*`, `[link](https://…)`, and an empty line starts a new paragraph.

### Edit, hide, delete
- **Edit:** open an entry, change it and **Save**.
- **Hide without deleting:** tick **Hide from the site**.
- **Delete:** open the entry's **⋯** menu and choose **Delete**.
- **Homepage placement:** tick **Big spot on the homepage** (featured) or **Show in „ტრენდში“** (trending).

### Web addresses
A quiz's link comes from its headline, turned into Latin letters (e.g. `quiz/airchie-sauzme-da-…/`). To keep a link fixed even if you change the headline later, fill in **Web address (optional)**, e.g. `which-dog`.

### Categories and menu
- **Categories:** add, rename or recolor them under **Categories**. The color tints that category's quiz headers and labels. Don't change a category's *web address* once quizzes use it.
- **Top menu:** **Site settings → Top menu.** Links can be `quizzes`, `articles`, `trending`, `about`, `contact`, or `category/food`-style category links.
- **About, Contact and Privacy pages, and social links:** also in **Site settings**.

---

## Look and branding

- **Logo:** *Site settings → Logo* (or put `logo.png` into the `images` folder). It's shown about 40 px high, and a wide logo with a transparent background works best. Without one, the site name shows as text.
- **Colors:** change `--brand` at the top of `assets/style.css` to your logo's main color. On GitHub, open the file, click the pencil, edit and commit.
- **Your own domain (e.g. kvizo.ge):** in GitHub **Settings → Pages → Custom domain**. Only the domain itself costs money.

---

## If something goes wrong

- **A quiz didn't appear.** Open **Actions** on GitHub and click the latest "Publish site" run. Its summary lists any entry that was skipped and why (for example "Question 3: mark exactly one correct answer"). Fix it in Pages CMS and save. The rest of the site keeps working.
- **"Result X points to a result that no longer exists".** An answer counts toward a result number you deleted. Pick an existing result for it.
- **The whole build is red.** Usually *Site settings* was saved with something odd. Open it in Pages CMS and save again. The log names the problem.

---

## What's in this folder

| Path | What it is |
|---|---|
| `.pages.yml` | Tells Pages CMS which forms to show (quizzes, articles, categories, settings) |
| `content/` | Your content: one file per quiz, article and category, plus `site.json` |
| `images/` | Uploaded pictures and your logo |
| `assets/` | Design and quiz engine (`style.css`, `render.js`, `site.js`) |
| `build.js` | Turns `content/` into the finished site. GitHub runs it after every save. |
| `.github/workflows/deploy.yml` | The "rebuild and publish after every save" instruction for GitHub |

**Limits:** GitHub Pages is free for public repositories, with a 1 GB site size and a soft limit of about 100 GB of traffic a month. GitHub's rules say it shouldn't be used mainly as a free host for an online business. If you add ads later, connect the same repository to **Cloudflare Pages** (free, build command `node build.js`, output folder `_site`). Pages CMS keeps working exactly the same.
