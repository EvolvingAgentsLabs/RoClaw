# OpenClaw Embodiment

## The Gap Between Digital and Physical

OpenClaw orchestrates digital agents — web browsing, code writing, email management. But it has no hands, no eyes, no way to affect the physical world. RoClaw bridges this gap.

## RoClaw as a Hardware Node

In OpenClaw's architecture, a **Node** is any agent that can receive tool invocations and return results. RoClaw registers as a hardware node with five capabilities:

- `robot.explore` — Autonomous exploration
- `robot.go_to {location}` — Visually-guided navigation
- `robot.describe_scene` — Scene understanding
- `robot.stop` — Emergency halt
- `robot.status` — Pose and state query

When a user says "go check the kitchen" via WhatsApp, OpenClaw routes the intent to RoClaw's Cortex, which translates it to a visual navigation goal for the Cerebellum.

## Why a Separate Robot Project?

OpenClaw is a cloud-native platform. RoClaw is a local hardware controller. Mixing them would pollute both:

- OpenClaw doesn't need stepper kinematics or UDP sockets
- RoClaw doesn't need WhatsApp integrations or web agents

The clean separation is: OpenClaw sends goals, RoClaw executes them. The interface is a WebSocket with five tool definitions. Nothing more.

## The First Hardware Node

RoClaw is intentionally small and cheap (~$30 BOM). It proves the architecture works. Future hardware nodes could be:

- A robot arm (pick and place)
- A drone (aerial inspection)
- A smart home controller (lights, locks, thermostat)

The pattern is always the same: register capabilities, receive goals, execute physically, report results.
