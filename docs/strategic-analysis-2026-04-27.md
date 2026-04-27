# RoClaw Strategic Analysis: Paper-Backed Improvement Roadmap

**Date:** 2026-04-27
**Inputs:** 4 research papers + idea storm proposals + codebase audit

---

## Papers Analyzed

| ID | Paper | Key Finding for RoClaw |
|---|---|---|
| P1 | Tehenan et al. — *Linear Spatial World Models Emerge in LLMs* (2506.02996) | LLMs encode spatial relations in a linear R^3 subspace. Compositional: "above-left" ≈ v_above + v_left. Causally steerable (74.3% success). |
| P2 | Martorell — *From Text to Space* (2502.16690, UBA/CONICET) | Cartesian (JSON) spatial representations consistently outperform textual and topographic formats. Spatial neurons in middle layers are representation-invariant. Small models (1B-3B) perform near chance; 8B+ needed for spatial reasoning. |
| P3 | Zhang et al. — *Spartun3D* (2410.03878, ICLR 2025) | Situated scene graphs (egocentric, with direction/distance/passby-objects) dramatically improve 3D spatial understanding. Explicit spatial alignment loss between 3D objects and text boosts performance 2-3% across all metrics. Navigation accuracy: 20.3% zero-shot with alignment module vs 0% without. |
| P4 | Zhou et al. — *NavGPT-2* (2407.12366, Adelaide) | VLM latents as visual-linguistic representation + topological graph navigation policy closes the gap with VLN specialists. Graph-Aware Self-Attention (GASA) with spatial affinity matrix enables backtracking. Two-stage training: freeze VLM, train policy network separately. |

---

## Cross-Reference: Idea Storm vs. Papers vs. Codebase Reality

### 1. CLOSE THE DISTILLATION LOOP (Qwen3-VL-2B local fine-tune)

**Idea storm proposal:** Transition default from `--gemini` to `--ollama` with a fine-tuned Qwen3-VL-2B student model achieving >90% parity with Gemini.

**Paper evidence:**

- **P2 (Martorell) — CRITICAL WARNING:** Models below 8B perform near chance level (~10%) on spatial navigation tasks. The 1B and 3B LLaMA models showed no meaningful improvement over random policy across all spatial information representations. Only at 8B did models achieve above-chance performance. **A 2B student model is likely too small for spatial reasoning.**
- **P1 (Tehenan):** Spatial world models were demonstrated in LLaMA-3.2-8B (3B instruction variant), but the probing experiments focused on 8B+. The linear spatial subspace may not emerge reliably in sub-3B models.
- **P4 (NavGPT-2):** The smallest model tested (FlanT5-XL, 3B) performed significantly worse than 7B+ variants. Their best results used Vicuna-13B. However, NavGPT-2 demonstrates that a frozen VLM + separate lightweight policy network can achieve near-SOTA results — suggesting the right approach is not to shrink the VLM but to decouple perception from policy.

**Codebase reality:**
- Ollama inference adapter exists and works (`src/4_llmunix_inference/adapters/ollama_adapter.ts`)
- `benchmark_distill.ts` does not exist — no distillation benchmark suite yet
- The fine-tuning pipeline would live in `llm_os/` (Unsloth LoRA), not RoClaw

**Revised recommendation:**

| Aspect | Original Proposal | Paper-Backed Revision |
|---|---|---|
| Student model size | Qwen3-VL-2B | Qwen3-VL-8B minimum, or use NavGPT-2 architecture (frozen VLM + tiny policy head) |
| Approach | Direct distillation (full VLM replacement) | Decouple: VLM as perceiver only (bounding boxes + labels), TS ReactiveController as policy |
| Parity target | >90% with Gemini | Redefine: >90% on *perception* accuracy (object detection), not on *motor policy* quality |
| Priority | Immediate | Medium — first improve the SceneGraph path (see below), then distill the perception-only VLM |

**The NavGPT-2 insight is key:** Don't try to make a tiny model do both perception AND motor planning. Use the VLM for perception only (bounding boxes, labels, spatial relations) and keep the deterministic ReactiveController for policy. This is exactly what the idea storm's "deprecate VLMMotorPolicy" proposal achieves, and it makes distillation tractable because perception is easier to distill than end-to-end reasoning.

---

### 2. DEPRECATE VLMMotorPolicy (Direct Tool Calling)

**Idea storm proposal:** Remove `vlm_motor_policy.ts`, force VLM to act as spatial perceiver only, let ReactiveController handle physics.

**Paper evidence:**

- **P3 (Spartun3D) — STRONG SUPPORT:** The situated scene graph is the critical intermediate representation. Their entire pipeline is: 3D scene → situated scene graph (with direction, distance, passby objects) → LLM generates situated captions and answers. The scene graph explicitly encodes egocentric spatial relations (front/back/left/right based on agent orientation + distance + obstacle awareness). This maps directly to RoClaw's SceneGraph.
- **P4 (NavGPT-2) — STRONG SUPPORT:** Separating VLM (perception) from policy network (action) is the architecture that works. Their frozen VLM produces visual-linguistic latents; a separate graph-based policy network makes navigation decisions. RoClaw's SceneGraphPolicy follows this same principle.
- **P1 (Tehenan) — SUPPORTS:** Spatial relations compose linearly in LLM activations. If the VLM outputs structured spatial relations (Cartesian coordinates, directional labels), the downstream policy can compose them algebraically rather than relying on the LLM's internal composition.
- **P2 (Martorell) — SUPPORTS:** Cartesian/JSON representations consistently outperform textual descriptions for spatial tasks. The SceneGraph naturally produces structured Cartesian data, which is the optimal input format.

**Codebase reality:**
- VLMMotorPolicy is the current **default** (`motor_policy` in system config)
- SceneGraphPolicy exists but is opt-in (`--scene-graph` flag)
- ReactiveController exists with collision checking, target tracking, stuck detection
- ReflexGuard exists but runs in shadow mode (logs vetoes but doesn't block)

**Verdict: PROCEED — all 4 papers support this change.**

The transition should be:
1. Make SceneGraphPolicy the default (swap flag polarity)
2. Activate ReflexGuard enforcement (exit shadow mode)
3. Simplify VLM prompt to output only: `{objects: [{label, box_2d, confidence}], spatial_relations: [{from, to, relation}]}`
4. Keep VLMMotorPolicy as `--legacy-motor` fallback during transition, then remove

---

### 3. DROP TextSceneSimulator (Text-Only Dreams)

**Idea storm proposal:** Remove `text_scene.ts` and shift dreaming entirely to headless MuJoCo simulation.

**Paper evidence:**

- **P2 (Martorell) — NUANCED:** Text-based spatial representations DO contain signal. LLaMA-3.1-8B with textual SIRs (Row/Column Description) still significantly outperformed random policy at 70B+ scale. The issue is not that text is useless — it's that it's consistently worse than Cartesian/visual representations.
- **P1 (Tehenan) — MILD SUPPORT:** Spatial world models emerge from text processing, but the R^3 subspace quality improves in deeper layers and with structured input. Text-only dreaming is not groundless, but it IS lower fidelity.
- **P3 (Spartun3D) — SUPPORTS REMOVAL:** The entire thesis is that global/textual descriptions are insufficient; situated, egocentric, structured representations are required. Text-only dreams lack situatedness.

**Codebase reality:**
- TextSceneSimulator has 5 hardcoded scenarios
- Fidelity weight for text dreams is already 0.3 (lowest tier)
- MuJoCo simulation exists via mjswan (browser-based, WebSocket bridge)
- Headless MuJoCo rendering would require Python-side changes (mujoco library supports headless)

**Verdict: PROCEED, but phase it — don't delete yet.**

| Phase | Action |
|---|---|
| Phase 1 | Stop generating new text-only traces. De-prioritize in dream consolidation. |
| Phase 2 | Implement headless MuJoCo dream rendering (mjswan + headless flag) |
| Phase 3 | Once MuJoCo dreams produce >10 traces, remove TextSceneSimulator |

The fidelity weights already correctly rank text dreams last (0.3). Deleting the code before headless MuJoCo works would leave no dreaming capability at all.

---

### 4. REMOVE ISA V1 (6-byte) Fallback

**Idea storm proposal:** Deprecate 6-byte frames, hardcode 8-byte V2 with sequence numbers and ACKs.

**Paper evidence:** None of the papers address low-level communication protocols. This is purely an engineering simplification decision.

**Codebase reality:**
- ISA v1 (6-byte) is the PRODUCTION format currently in use
- ISA v2 (8-byte) is implemented but NOT deployed to ESP32 firmware
- `decodeFrameAuto` handles both formats
- ESP32 firmware would need to be reflashed for V2

**Verdict: PROCEED, but only after ESP32 firmware is updated.**

The risk is bricking the robot by removing V1 before V2 is deployed on the ESP32. Sequence:
1. Flash ESP32 with V2-only firmware
2. Verify V2 frames work end-to-end
3. Remove `decodeFrame` V1 logic and `decodeFrameAuto` branching
4. Simplify `BytecodeCompiler` to emit exactly 8 bytes

---

### 5. PRUNE ESP32 OpCodes

**Idea storm proposal:** Remove step-based opcodes (`MOVE_STEPS_L`/`MOVE_STEPS_R`) and `GET_STATUS`, operate on velocity commands + continuous telemetry.

**Codebase reality correction:** `MOVE_STEPS_L` does NOT exist in the codebase. The actual opcodes are: `MOVE_FORWARD`, `MOVE_BACKWARD`, `ROTATE_CW`, `ROTATE_CCW`, `STOP`, `GET_STATUS`, `SET_SPEED`. There are no step-based opcodes to remove.

**Verdict: PARTIALLY APPLICABLE.** Only `GET_STATUS` is redundant given TelemetryMonitor's continuous UDP stream. The velocity-only command set is already the reality.

---

### 6. VISUAL ODOMETRY + IMU FUSION

**Idea storm proposal:** Add MPU6050/BNO085 IMU to ESP32-S3, fuse with VLM optical flow for visual odometry.

**Paper evidence:**

- **P4 (NavGPT-2) — RELEVANT:** Uses directional embeddings and step embeddings in their graph memory. The navigation policy requires reliable pose information. Visual odometry from VLM multi-frame history is a promising approach — NavGPT-2 processes multi-view images at each step.
- **P3 (Spartun3D) — RELEVANT:** Standing point and orientation are CRITICAL inputs. The entire situated scene graph depends on knowing where the agent is standing and which direction it faces. Without reliable pose, the scene graph degrades.

**Codebase reality:**
- TelemetryMonitor does dead reckoning from stepper step counts
- Stall detection exists (motor current thresholds)
- No IMU hardware currently integrated
- VLM receives 4-frame video clips but doesn't extract optical flow

**Verdict: HIGH VALUE, but hardware-dependent.**

Priority order:
1. **Software-only (no hardware change):** Add VLM-based stuck detection — compare consecutive frames, detect if scene is static despite motor commands. This partially exists (stall detection via motor current) but visual confirmation would catch wheel-slip cases.
2. **IMU integration:** Add BNO085 to ESP32-S3, update UDP telemetry JSON to include heading/pitch/roll. This gives ground-truth heading that the VLM can't provide.
3. **Full visual odometry:** Multi-frame optical flow estimation. This is a research project, not an engineering task. Defer.

---

### 7. MONOCULAR DEPTH ESTIMATION FROM VLM

**Idea storm proposal:** Train distilled Qwen3-VL to output `distance_estimate_cm` alongside `box_2d`. Improve SceneGraph accuracy for 1st-person camera.

**Paper evidence:**

- **P3 (Spartun3D) — DIRECTLY RELEVANT:** The situated scene graph explicitly includes **distance** (Euclidean distance from agent standing point to object bounding box center) and **passby objects** (obstacles between agent and target). This is exactly the structured output the idea storm proposes. Spartun3D demonstrates that computing distance + direction from the scene graph dramatically improves spatial reasoning.
- **P2 (Martorell) — SUPPORTS:** Cartesian coordinates (which require distance estimation) consistently outperform textual descriptions. If the VLM can output `(x, y, distance)` per object, the SceneGraph becomes maximally informative.
- **P1 (Tehenan) — THEORETICAL SUPPORT:** Spatial world models encode positions as R^3 vectors. If the VLM outputs distance estimates, these can be mapped to structured Cartesian coordinates that align with how LLMs internally represent space.

**Codebase reality:**
- Current VLM prompt requests bounding boxes but NOT depth
- SceneGraph projection from overhead camera is straightforward (known camera geometry)
- 1st-person ESP32-CAM projection assumes flat ground — fragile
- No monocular depth model is currently integrated

**Verdict: HIGH VALUE — key enabler for 1st-person autonomy.**

Implementation approach informed by Spartun3D:
1. Modify VLM prompt to request: `{label, box_2d, estimated_distance_cm, direction_from_agent}`
2. For overhead camera: compute distance geometrically (known camera matrix)
3. For 1st-person camera: VLM estimates distance using bounding-box size + scene context
4. Feed structured output into Spartun3D-style situated scene graph: `{object, direction, distance, passby_objects}`
5. This representation is what P3 shows produces the best spatial understanding

---

### 8. CONTINUOUS DREAM CONSOLIDATION FLYWHEEL

**Idea storm proposal:** Auto-trigger snapshots on ReflexGuard vetoes and stuck events. Overnight: render failure in MuJoCo → try alternatives → generate synthetic traces → LoRA fine-tune → hot-swap GGUF.

**Paper evidence:**

- **P4 (NavGPT-2) — SUPPORTS SYNTHETIC DATA:** NavGPT-2 generates 10K navigation reasoning traces using GPT-4V as teacher. This teacher-student data generation pipeline is directly analogous to the proposed dream flywheel — use a capable model (Gemini) to generate reasoning traces, then fine-tune a smaller model.
- **P3 (Spartun3D) — SUPPORTS AUTOMATED DATASET GENERATION:** Spartun3D generates ~133K examples automatically using GPT-4o + situated scene graphs. The pipeline is: design situation → construct scene graph → prompt LLM to generate QA pairs. This validates the approach of automated trace generation for fine-tuning.

**Codebase reality:**
- Dream consolidation exists but is manually triggered via skillos
- No auto-trigger on ReflexGuard vetoes or stuck events
- No MuJoCo headless rendering for dream replay
- LoRA fine-tuning would use llm_os Unsloth pipeline (exists conceptually but not wired)

**Verdict: ASPIRATIONAL but architecturally sound. Break into milestones.**

| Milestone | Description | Dependency |
|---|---|---|
| M1: Auto-snapshot | Emit trace on ReflexGuard veto or stuck event (append to `traces/`) | None — pure software |
| M2: Periodic dream | `/llmunix loop 1h /llmunix dream` — already supported | M1 |
| M3: Sim replay | Headless MuJoCo renders failure scenario from trace | mjswan headless mode |
| M4: Alternative search | Run VLM on sim replay with different actions | M3 + SceneGraphPolicy |
| M5: Synthetic traces | Successful alternatives become new training traces | M4 |
| M6: Auto fine-tune | LoRA fine-tune on accumulated traces, produce new GGUF | llm_os pipeline |
| M7: Hot-swap | Ollama model reload without restart | Ollama API supports this |

M1-M2 are achievable now. M3-M4 require mjswan headless rendering. M5-M7 are the full flywheel.

---

## Priority-Ranked Roadmap

Based on paper evidence strength, codebase readiness, and impact:

### Tier 1: Do Now (paper-validated, code-ready)

1. **Make SceneGraphPolicy the default** — All 4 papers support separating perception from policy. The code exists. Swap the flag.
2. **Activate ReflexGuard enforcement** — Exit shadow mode. Spartun3D's passby-object awareness maps directly to collision-aware navigation.
3. **Add distance estimation to VLM prompt** — Spartun3D shows this is the single highest-impact improvement for spatial understanding. Modify the prompt, not the model.
4. **Auto-snapshot on veto/stuck** — Write trace on ReflexGuard veto or TelemetryMonitor stuck event. Zero risk, enables M1-M2 of the dream flywheel.

### Tier 2: Do Next (paper-supported, needs engineering)

5. **Restructure VLM output as Spartun3D-style situated scene graph** — `{object, direction, distance, passby_objects}` per detected entity. This is the representation that produces best results across P3's experiments.
6. **Transition to ISA V2** — Flash ESP32, verify, then remove V1 fallback.
7. **Cartesian coordinate format for SceneGraph** — P2 proves JSON/Cartesian representations consistently outperform textual for spatial tasks. Ensure SceneGraph outputs coordinates, not prose.

### Tier 3: Do Later (high value, significant effort)

8. **Distill perception VLM** — After SceneGraphPolicy is default, distill the perception-only VLM. Target 8B minimum per P2's findings. Use NavGPT-2's architecture insight: keep VLM frozen, train only the perception head.
9. **IMU integration** — BNO085 on ESP32-S3, update telemetry protocol. Enables ground-truth heading for situated scene graph.
10. **Headless MuJoCo dreams** — Replace text-only dreaming with sim-rendered dreams. Requires mjswan headless mode.

### Tier 4: Future (research-grade)

11. **Full dream flywheel** (M3-M7) — Automated failure replay → alternative search → synthetic traces → fine-tune → hot-swap.
12. **Visual odometry from multi-frame VLM** — Optical flow estimation from consecutive frames.
13. **VLM activation steering** — Use P1's spatial subspace manipulation to bias the VLM toward desired spatial relations (e.g., steer toward "in front" when approaching target).

---

## Key Insight from Papers

The single most important finding across all four papers: **structured spatial representations (Cartesian coordinates, scene graphs with explicit direction/distance) dramatically outperform unstructured text descriptions for spatial reasoning.** This validates the SceneGraph architecture over VLMMotorPolicy, and suggests the highest-ROI improvement is not model size or fine-tuning but rather the *format* of the spatial information flowing through the system.

RoClaw already has the right architecture (SceneGraph + ReactiveController). The priority is making it the default path and enriching it with the structured spatial information that the research shows matters most: egocentric direction, metric distance, and obstacle awareness (passby objects).
