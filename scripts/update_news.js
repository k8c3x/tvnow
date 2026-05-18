import admin from "firebase-admin";
import fs from "fs";
import axios from "axios";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearCollection(name) {
  const snapshot = await db.collection(name).get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
}

async function updateNews() {
  console.log("Fetching 365Scores news...");

  const url =
    "https://webws.365scores.com/web/news/?appTypeId=5&langId=9&timezoneName=Asia%2FBaghdad&userCountryId=114&sports=1&isPreview=true";

  const response = await axios.get(url);
  const articles = response.data.items || response.data.news || [];

  await clearCollection("sports_news");

  const batch = db.batch();

  articles.forEach((item, index) => {
    const ref = db.collection("sports_news").doc(String(index));

    batch.set(ref, {
      newsId: item.id || index,
      title_ar: item.title || "",
      title_en: item.title || "",
      content_ar: item.subtitle || item.summary || "",
      content_en: item.subtitle || item.summary || "",
      imageUrl: item.image?.original || item.image || "",
      url: item.url || "",
      source: "365Scores",
      publishedAt: item.publishDate || item.date || "",
    });
  });

  await batch.commit();

  console.log(`Updated ${articles.length} news articles.`);
}

updateNews()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
