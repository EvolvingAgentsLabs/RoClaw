# A Robot That Dreams About Its Navigation — Built on Gemini

We built a robot that navigates a physics simulation using nothing but camera frames and Gemini 3.1 Flash Lite. After each session, it "dreams" — replaying its experience through a bio-inspired consolidation engine that extracts reusable navigation knowledge. One successful run generated 1,578 causal edges in a knowledge graph.

If you're exploring AI agents in the physical world, here's what we learned — and what Gemini made possible.


## The Setup

RoClaw is a 20cm cube robot (real hardware + MuJoCo simulation) controlled by a vision-language model. The architecture is simple: a camera grabs a frame, a VLM looks at it and decides what motor command to issue, a compiler turns that into 6-byte bytecodes, and the robot moves. Repeat at 2 frames per second.

We call it the Cognitive Trinity — three open-source repositories modeled on brain regions. RoClaw is the Cerebellum (reactive motor control). evolving-memory is the Hippocampus (experience storage and dream consolidation). SkillOS, built by Ismael Faro, is the Prefrontal Cortex (planning and reasoning via a pure markdown operating system).

The VLM at the center of all of this is Gemini 3.1 Flash Lite.


## Why Gemini

We tested multiple approaches before landing on what works. Here's the honest story.

Gemini 3.1 Flash Lite hits a specific sweet spot for VLM robotics: it's fast enough for real-time control (~2s per inference on the free tier), it understands spatial relationships in images well enough to drive a robot, and it outputs structured tool calls that a bytecode compiler can parse directly.

The motor command format is straightforward. The model receives a camera frame and a goal ("navigate to the red cube"), and it outputs something like:

TOOLCALL:{"name":"move_forward","args":{"speed_l":180,"speed_r":180}}

Seven opcodes total — move_forward, move_backward, rotate_cw, rotate_ccw, turn_left, turn_right, stop. The VLM picks the right one based on what it sees. No reward function, no RL training, no policy network. Just a foundation model looking at an image and making a motor decision.

In our validated test, the robot started 2.55 meters from a red cube and navigated to within 0.41 meters — correctly turning toward the target, adjusting heading, and driving forward. Gemini Flash Lite did this out of the box with zero fine-tuning.


## The Insight That Changed Everything

Before the camera approach worked, we spent weeks trying text-based navigation. We rendered the robot's spatial context as structured text — distances, headings, clearances — and fed it to the same Gemini models.

It failed. Across Flash Lite, Flash, and Pro. Every model.

The models would see "CLEARANCE: forward 250cm, left 45cm" and output something that looked reasonable but didn't actually work. They weren't reasoning about space — they were pattern-matching on text that happened to contain numbers.

Then we added a diagnostic flag (--describe-scene) that asks the VLM to describe what it sees in the camera frame as text, after making its motor decision. This revealed what the model actually uses for navigation.

At 2.29 meters from the target, it described: "Checkered floor, purple object on the left, dark obstacle on the right, clear path through the center."

At 1.0 meter: "A single, solid red cube centered in field of view, approximately 100-150cm away."

At 0.45 meters: "Large solid red block, 50-100cm away, open path on the left."

The model navigates by visual composition — object position in the frame, relative size, how much of the field of view the target occupies. Exactly how a human driver navigates. Not by computing distances from coordinate grids.

The takeaway for anyone building VLM-controlled robots: don't convert visual information to text to feed to a vision model. You're destroying the exact signal the model needs. Just send the image.


## The Dream Engine

Here's where the architecture gets interesting for the AI agents community.

After the robot finishes navigating, we capture the full trace — every camera frame's context paired with the motor command the VLM chose and the result (did the robot get closer? did it collide?). This trace gets posted to our evolving-memory server, a cognitive trajectory engine modeled on biological memory consolidation.

Then we trigger the dream cycle. Three phases, inspired by mammalian sleep:

**Slow-Wave Sleep** replays the trace and extracts constraints. "When the target is to the right, rotate clockwise. When the path is clear and the target is centered, move forward at high speed."

**REM** recombines fragments into novel scenarios. "What if the obstacle had been directly in front? Which strategy handles that?" It generates counterfactual variations the robot never actually encountered.

**Consolidation** wires everything into a persistent knowledge graph with causal edges, confidence scores, and fidelity weights.

One navigation trace. One dream cycle. The knowledge graph went from 38 child nodes to 533, and from 110 causal edges to 1,578. Each edge represents a learned relationship between a visual context, a motor command, and an outcome.

Gemini powers this too — the dream engine uses Gemini to extract constraints from traces, identify causal relationships, and generate the counterfactual scenarios during the REM phase. It's Gemini all the way through: Gemini sees through the camera, Gemini drives the robot, and Gemini dreams about what it learned.


## A Practical Detail That Matters

One thing that almost killed the project and might save you time if you're building something similar.

VLM inference takes about 2 seconds per call with Flash Lite. Our VisionLoop was designed to stop the robot before every inference call — send a STOP command, wait for the robot to settle, grab a frame, send it to the model, get the response, then execute the new motor command.

This meant the robot was moving for maybe 100 milliseconds between 2-second stops. It barely moved at all despite sending correct commands.

The fix: coastDuringInference. Let the previous motor command keep running while the VLM thinks about the next frame. The robot coasts forward (or continues turning) during inference, and when the new command arrives, it smoothly transitions. This is essential for any VLM-in-the-loop control system where inference latency exceeds a few hundred milliseconds.

Without this, the robot looked broken. With it, smooth navigation.


## Where This Goes

The dream engine doesn't just consolidate knowledge for future sessions. It builds a training dataset.

Every captured trace — what the robot saw, what command it chose, what happened — is a supervised training example. We're building a flywheel: generate hundreds of randomized navigation scenarios in simulation using Gemini as the teacher, capture all traces, dream-consolidate, and use the resulting dataset to fine-tune a small 2B parameter model (Qwen3-VL) that runs locally on edge hardware.

The goal: a robot that navigates with sub-200ms inference, no API calls, no cloud dependency — trained on the distilled experience of Gemini thinking about thousands of scenarios and then dreaming about what it learned.

The Cognitive ISA (the TOOLCALL motor command format) becomes the training language. The student model doesn't need to learn robotics from scratch. It learns the language that Gemini already validated against a physics engine.


## If You're Building Something Similar

A few concrete things we'd share with anyone putting VLMs into physical systems:

**Send images, not text descriptions.** VLMs navigate by visual composition — relative sizes, positions in frame, occlusion. If you convert camera data to text coordinates, you lose the spatial reasoning the model is actually good at.

**Account for inference latency in your control loop.** If your model takes 2 seconds to respond, you need a strategy for what the robot does during those 2 seconds. Stopping between every frame makes the robot useless. Coasting on the previous command works well.

**Capture traces from day one.** Even before you have a training pipeline, start recording what the model sees and what it decides. Structured traces are the raw material for everything downstream — dream consolidation, fine-tuning, debugging.

**Fidelity-weight your data.** Not all experience is equal. A trace from a real camera in a physics simulation (fidelity 0.8) is more trustworthy than a trace from a text-based dream scenario (fidelity 0.3). Your knowledge graph should reflect this.

**Dream consolidation is not just for storage.** Replaying and recombining traces surfaces patterns that no single run reveals. Our dream engine found navigation strategies by comparing across traces that no individual session contained.


## Open Source

Everything is open source under Evolving Agents Labs:

RoClaw (the robot + trace capture + distillation pipeline): github.com/EvolvingAgentsLabs/RoClaw

evolving-memory (dream engine + knowledge graph): github.com/EvolvingAgentsLabs/evolving-memory

SkillOS (markdown OS for agent reasoning, by Ismael Faro): github.com/EvolvingAgentsLabs/skillos

The trace capture, dream consolidation, and knowledge graph expansion are validated end-to-end. The distillation pipeline — scenario generator, overnight flywheel, fine-tuning — is actively in progress.

If you're putting AI agents into the physical world, we'd love to hear what you're building.

---

Built at Evolving Agents Labs. Powered by Gemini 3.1 Flash Lite for VLM inference and dream consolidation, Google's MuJoCo for physics simulation, and Claude for architecture and development.
