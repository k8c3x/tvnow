import admin from "firebase-admin";
import fs from "fs";
import Parser from "rss-parser";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const parser = new Parser();

async function clearCollection(name) {
  const snapshot = await db.collection(name).get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

async function updateNews() {
  console.log("Fetching sports news...");

const feeds = [
  "https://www.espn.com/espn/rss/soccer/news",
  "https://www.ysscores.com/ar/rss"
];

  await clearCollection("sports_news");

  const batch = db.batch();
  let count = 0;

  for (const feedUrl of feeds) {
    const feed = await parser.parseURL(feedUrl);

    for (const item of feed.items.slice(0, 20)) {
      const id = String(count++);
      const ref = db.collection("sports_news").doc(id);

      batch.set(ref, {
        title_en: item.title || "",
        title_ar: item.title || "",
        content_en: item.contentSnippet || "",
        content_ar: item.contentSnippet || "",
        url: item.link || "",
        source: "Goal.com",
        publishedAt: item.pubDate || "",
      });
    }
  }

  await batch.commit();

  console.log("Sports news updated.");
}

updateNews()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
