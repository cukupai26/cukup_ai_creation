# CukupAI — Guard Your Cash. Guard Your Family.

CukupAI is an empathetic, AI-driven financial guardrail Progressive Web App (PWA) built for the Meta Global AI Developer Hackathon (Startups Track).

## 🚀 Live Demo & PWA Application
- *Live App URL:* https://cukup-ai-creation-git-168006365019.europe-west1.run.app/

## 🛠️ Tech Stack & Architecture
- *Frontend & PWA:* Next.js, React, Tailwind CSS (Mobile-first, Offline-first)
- *AI Core Reasoning:* Meta Llama 3.1 (via Inference Partner APIs)
- *Computer Vision & OCR:* Google ML Kit (On-device local parsing for $0 cost) + Meta SAM 3.1 (Receipt Segmentation)
- *Data Grounding:* Meta Search Grounding API for Kemensos DTKS & Official Social Assistance Data

## 🔧 Prerequisites & Setup
1. Clone the repository
2. Install dependencies: npm install
3. Set your Meta Model API keys in .env.local:
   ```env
   META_MODEL_API_KEY=your_meta_api_key