# ⬡ Universal AI Hub - Web Client

This is a high-performance **Next.js Web App** designed to interface with the **Universal MCP Hub** (aka Universal AI Hub). 

### Zero-Bloat Strategy
I don't like local Node.js environments or heavy dependencies. This project is built to be deployed directly via **GitHub to Vercel**. No `npm install` or local `node_modules` required on your machine.

* **Pure Web UI**: Mirroring the logic of the [Universal MCP Desktop Client](https://github.com/VolkanSah/Universal-MCP-Hub-sandboxed).
* **Direct Connect**: Communicates directly from your browser to your Hub instance.
* **Security**: HF Tokens and Hub URLs are stored locally in your browser's `localStorage`. No data is stored on Vercel.

## Getting Started (The Clean Way)

1. **Deploy**: Simply connect this repo to your [Vercel](https://vercel.com) account.
2. **Settings**: Go to the **Settings** tab in the Web App and enter your `HF_TOKEN` and `HUB_URL`.
3. **Connect**: Hit the **Connect** button to fetch your active tools, providers, and models.
4. **Interact**: Use the Chat tab to prompt your AI Hub, upload files, and trigger MCP tools.

## Features
* Full parity with `hub.py` logic.
* Dynamic tool and model fetching.
* Base64 image and text file support.
* GitHub dark-themed UI for maximum focus.

---
*Created by Volkan Kücükbudak - 2026*
