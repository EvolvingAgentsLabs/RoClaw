"""
Build the RoClaw 3D simulation scenes using mjswan.

Loads all MJCF scene files and creates a mjswan project with multiple
selectable scenes. The browser scene selector shows all available scenarios.

Scenes:
  - Navigation Arena     — Open arena with 3 obstacles and 1 red cube target
  - Multi-Room Doorway   — Dividing wall with 40cm doorway gap
  - Dense Obstacle Field — 8 obstacles with narrow passages
  - L-Shaped Corridor    — Confined L-shaped corridor with 60cm width
  - Scavenger Hunt       — 3 colored cube targets with moderate obstacles

Each scene includes the RoClaw robot with:
  - "eyes": Forward-facing camera (first-person view)
  - "external_cam": Overhead bird's-eye view

Usage:
    cd sim && python build_scene.py
"""

import os
import mujoco
import mjswan

# Resolve paths relative to this script's directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(SCRIPT_DIR, "dist")

# Scene definitions: (filename, display name)
SCENES = [
    ("roclaw_robot.xml",           "Navigation Arena"),
    ("roclaw_multiroom.xml",       "Multi-Room Doorway"),
    ("roclaw_dense_obstacles.xml", "Dense Obstacle Field"),
    ("roclaw_corridor.xml",        "L-Shaped Corridor"),
    ("roclaw_scavenger.xml",       "Scavenger Hunt"),
]

builder = mjswan.Builder()
project = builder.add_project("RoClaw Sim")

for filename, name in SCENES:
    path = os.path.join(SCRIPT_DIR, filename)
    if os.path.exists(path):
        spec = mujoco.MjSpec.from_file(path)
        project.add_scene(spec=spec, name=name)
        print(f"  + {name} ({filename})")
    else:
        print(f"  ! Skipping {name} — {filename} not found")

app = builder.build(DIST_DIR)
app.launch(port=8000)
