import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: "v1", // gemini
});

app.get("/", (req, res) => {
  res.send("🚀 Gemini API Server is running!");
});

app.post("/explain", async (req, res) => {
  const { country, val, population, income } = req.body;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
You are a public health analyst.

The global average prevalence of dementia ranges from approximately 1,000 to 8,000 cases per 100,000 people, depending on regional and socioeconomic factors.

Given the following data:
- Country: ${country}
- Dementia prevalence rate: ${val} per 100,000
- Population: ${population}
- Income level: ${income}

Using the global average as a frame of reference, determine if this rate is relatively high, low, or typical — especially in the context of this country's income level and population.

Then briefly explain 2–3 specific public health, social, or environmental factors that might contribute to this rate. Keep the response clear, concise (2–3 sentences), and easy for a general audience to understand.
Avoid repeating the numeric values.

After, include 2-3 links that inform the user with information regarding the specific public health, social, or environmental factors that might contribute to this rate.    
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();
    res.json({ explanation });
  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({ error: "Gemini API failed" });
  }
});

app.listen(3001, () => {
  console.log("✅ Gemini API server running at http://localhost:3001");
});
