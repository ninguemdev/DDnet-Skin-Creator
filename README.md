# DDNet Skin Creator

Web-based skin editor for DDNet Network. Draw your custom 2D skin, preview it in real time, and export a game-ready texture.

**Live Demo:** https://lcw92y.csb.app/

---

## Features

- **Pixel‑perfect editor** (192×192 canvas) with pen, eraser, bucket fill and undo/redo  
- **Layer support**: body, shadows, hand, foot, six eye variants  
- **Real‑time preview**: composited game view alongside editor  
- **Export**: download final 512×256 PNG texture  
- **Template overlay** and **drawing bounds** guides  
- **Responsive, light & dark themes**  

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) v14+  
- npm (comes with Node.js)  

---

## 🚀 Installation & Run


# 1. Clone the repo
git clone https://github.com/YOUR_USER/YOUR_REPO.git

cd YOUR_REPO

# 2. Install dependencies
npm install express

# 3. Start the server
node App.js


By default, the server runs on port **3001**. Open your browser at:


http://localhost:3001/


---

## 📁 Project Structure


DDnet-Skin-Creator/
├── App.js             # Express server
├── package.json       # Node.js metadata
├── assets/
│   ├─ index.html      # Main HTML
│   └─ template.png    # Skin template overlay
├── css/
│   └─ styles.css      # Responsive, modern styling
└── js/
    └─ script.js       # Full-featured editor & export logic


---

## 🎨 Usage

1. **Select layer** from the dropdown (Body, Shadow, Hand, Foot, Eye variants).  
2. **Choose tool**:  
   - **Pen**: draw pixels  
   - **Eraser**: remove pixels  
   - **Bucket**: flood fill region  
   - **Undo**: revert last action  
3. **Adjust brush size** slider (1–128 px) and color picker.  
4. **Toggle** template overlay or drawing bounds for guidance.  
5. **Real‑time preview** shows the composited in‑game view.  
6. Click **Download Texture** to save the 512×256 PNG.  

---

## 🤝 Contributing

1. Fork this repository  
2. Create a feature branch (`git checkout -b feature/XYZ`)  
3. Commit your changes (`git commit -m "Add XYZ"`)  
4. Push to your branch (`git push origin feature/XYZ`)  
5. Open a Pull Request  

