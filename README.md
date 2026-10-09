# 🌲 Bird & Nature Caller

An offline-first Progressive Web App (PWA) built for the **Hacktoberfest Open-Source AI Challenge (Week 1: Touch Grass)**. 

Bird Caller listens to your microphone and identifies bird songs, wildlife, and weather elements (like rain, streams, or wind) in real-time. Because it runs an **open-weight model** entirely in your browser using Transformers.js, it works 100% offline—perfect for taking into the deep woods where there's no cell service!

## ✨ Features
- **Real-Time Classification**: Identifies nature sounds around you within seconds.
- **Privacy-First & Offline**: Inference runs directly in your browser. No audio data is ever sent to a server.
- **Field Journal**: Click the `+` button next to any identified sound to log it in your persistent offline Field Journal.
- **Smart Filtering**: The underlying model (AST) recognizes 527 classes, but we filter the predictions specifically for birds, insects, amphibians, and weather.

## 🛠️ Tech Stack
- **Frontend**: React, Vite
- **Machine Learning Engine**: [Transformers.js](https://huggingface.co/docs/transformers.js/index)
- **Open-Weight Model**: `Xenova/ast-finetuned-audioset-10-10-0.4593` (Audio Spectrogram Transformer)
- **Styling**: Vanilla CSS with glassmorphism aesthetics

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/624183-NITAP/bird-caller.git
   cd bird-caller
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

> **Note**: The very first time you click "listen", the app will download the model from Hugging Face (around ~340MB). Once downloaded, it is permanently cached in your browser for offline use.

## 🏆 Hacktoberfest 2026
This project was built for the **Touch Grass** challenge, proving that Open-Source AI can augment our physical world without typing us to a server rack.
