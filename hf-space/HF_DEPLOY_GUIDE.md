# Hugging Face Space Deployment Guide for Phylaxify ML (Layer 3)

This directory contains the necessary files to deploy the Phylaxify Judol Detection ML service to Hugging Face Spaces.

## Files included:
- `app.py`: The FastAPI application that loads the BERT model.
- `models/`: Directory containing `model.safetensors`, `config.json`, etc.
- `requirements.txt`: Python dependencies (fastapi, torch, transformers).

## Deployment Steps:

1. **Create a New Space on Hugging Face:**
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - Give it a name (e.g., `phylaxify-ml`).
   - Select **Docker** as the Space SDK (or **Python** with `app.py`).
   - If using **Python**, ensure the "App file" is set to `app.py`.
   - Set the Space to **Public** (or Private if you want to use a Token, but Public is easier for integration).

2. **Upload Files:**
   - Upload all files from this `hf-space/` directory to the root of your new Space.
   - Alternatively, use `git` to push the files.

3. **Get your API URL:**
   - Once the Space is "Running", your API URL will be:
     `https://<your-username>-<your-space-name>.hf.space`
   - Test it by visiting `https://<your-username>-<your-space-name>.hf.space/health`.

4. **Connect to Phylaxify:**
   - Go to your Vercel Dashboard for the Phylaxify project.
   - Add a new Environment Variable:
     - **Key:** `JUDOL_ML_API_URL`
     - **Value:** `https://<your-username>-<your-space-name>.hf.space` (without trailing slash).
   - Also add it to your `.env.local` for local testing.
   - (Optional) Set `JUDOL_ML_CONFIDENCE_THRESHOLD` (default 0.7) if needed.

5. **Done!**
   - Layer 3 ML filtering is now active and will automatically be called for setiap donation yang masuk.
