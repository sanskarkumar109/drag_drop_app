🛠️ Network Topology Creater

A web-based application for designing and visualizing network topologies.  
Built with a **Django backend** and a **Html,css and JavaScript frontend** using the **Konva.js** library, it allows users to create, connect, 
and group network devices, then export the topology as a structured **JSON file**.

---

## ✨ Features

- **Graphical Interface**: Draw network diagrams using a drag-and-drop interface.  
- **Device Representation**: Add customizable shapes (routers, switches, etc.) to the canvas.  
- **Link Creation**: Connect devices with links, assign them as **1G** or **10G** cables.  
- **Advanced Points**: Add Lag Points (for link aggregation) and CFM Points (for fault management).  
- **Grouping**: Group multiple devices and connections, with properties like protocol and transport type.  
- **JSON Export**: Generate a structured JSON file of the entire topology, including groups, shapes, connections, and properties.  

---

## 🚀 Getting Started

### ✅ Prerequisites
- [Python 3.x](https://www.python.org/downloads/)  
- [pip](https://pip.pypa.io/en/stable/)

---

### 🔧 Installation

Clone the repository:
git clone https://github.com/sanskarkumar109/drag_drop_app.git
cd drag_drop_app
Install dependencies and run the Django backend:

pip install Django
python manage.py runserver
The application will now be running at:
👉 http://127.0.0.1:8000/

📖 Usage
Open the application in your web browser.

Use the controls to add shapes (routers, switches) to the canvas.

Drag and drop shapes to arrange them.

Select two shapes to create a link between them.

Add Lag Points or CFM Points to links.

Select multiple shapes → Create Group → assign properties.

Click Generate JSON to view and export the topology data.

🧰 Tools & Technologies
Backend: Django (Python)

Frontend: Html,css and JavaScript + Konva.js

Export: JSON structured topology

📌 Future Improvements
User authentication & saved topologies

Import JSON to reload topologies

Support for more device types & protocols

Enhanced UI with drag/drop from device palette

🤝 Contributing
Contributions are welcome! Feel free to open issues and pull requests.
