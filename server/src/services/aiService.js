import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY in environment variables");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ============================================================
// Tool definitions — Groq function calling schema
// These are the actions the AI can perform on the board
// ============================================================
const BOARD_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the board",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Optional description" },
          column: {
            type: "string",
            description:
              "Column id: backlog | todo | in_progress | in_review | done",
          },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          type: {
            type: "string",
            enum: ["task", "bug", "story", "epic", "milestone"],
          },
          assigneeNames: {
            type: "array",
            items: { type: "string" },
            description: "List of assignee names",
          },
          dueDate: { type: "string", description: "ISO date string" },
          tags: { type: "array", items: { type: "string" } },
          sprint: { type: "string", description: "Sprint name if applicable" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_tasks",
      description: "Update one or more tasks matching a filter",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "object",
            description: "Filter to select tasks",
            properties: {
              status: { type: "string" },
              priority: { type: "string" },
              assigneeName: { type: "string" },
              column: { type: "string" },
              sprint: { type: "string" },
              overdue: { type: "boolean" },
              tagContains: { type: "string" },
              titleContains: { type: "string" },
            },
          },
          updates: {
            type: "object",
            description: "Fields to update",
            properties: {
              column: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              assigneeNames: { type: "array", items: { type: "string" } },
              dueDate: { type: "string" },
              sprint: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
          },
        },
        required: ["filter", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_tasks",
      description: "Move tasks from one column to another",
      parameters: {
        type: "object",
        properties: {
          fromColumn: { type: "string" },
          toColumn: { type: "string" },
          filter: {
            type: "object",
            description: "Additional filters for tasks to move",
          },
        },
        required: ["fromColumn", "toColumn"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_tasks",
      description: "Search or filter tasks and return results to user",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "object",
            properties: {
              assigneeName: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              column: { type: "string" },
              overdue: { type: "boolean" },
              blocked: { type: "boolean" },
              sprint: { type: "string" },
              titleContains: { type: "string" },
              dueBefore: { type: "string" },
              dueAfter: { type: "string" },
            },
          },
          sortBy: {
            type: "string",
            enum: ["priority", "dueDate", "createdAt", "title"],
          },
          limit: { type: "number", default: 20 },
        },
        required: ["filter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_sprint",
      description: "Create a new sprint on the board",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          goal: { type: "string" },
          durationWeeks: {
            type: "number",
            description: "If no endDate, calculate from duration",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_standup",
      description: "Generate a standup summary for the team",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "yesterday", "this_week"],
            default: "today",
          },
          teamMemberName: {
            type: "string",
            description: "Filter to specific member, or all if omitted",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_tasks",
      description: "Assign tasks to team members",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "object", description: "Which tasks to assign" },
          assigneeNames: { type: "array", items: { type: "string" } },
          replaceExisting: { type: "boolean", default: false },
        },
        required: ["filter", "assigneeNames"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_delete",
      description: "Delete tasks matching a filter (requires confirmation)",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "object" },
          confirm: { type: "boolean", description: "Must be true to execute" },
        },
        required: ["filter"],
      },
    },
  },
];

// ============================================================
// System prompt builder — give AI context about the board
// ============================================================
function buildSystemPrompt(boardContext) {
  const { board, members, tasks, currentUser } = boardContext;

  const memberList = members.map((m) => `- ${m.name} (${m.email})`).join("\n");
  const columnList = board.columns
    .map((c) => `- ${c.id}: "${c.title}"`)
    .join("\n");
  const taskSummary = `${tasks.total} total tasks (${tasks.byStatus.join(", ")})`;
  const now = new Date().toISOString();

  return `You are TaskFlow AI, an intelligent project management assistant embedded in a Kanban board.

  Current user: ${currentUser.name} (${currentUser.email})
  Current board: "${board.name}"
  Current time: ${now}

  Board columns:
  ${columnList}

  Team members:
  ${memberList}

  Board summary: ${taskSummary}

  You help users manage their board through natural language. You have tools to create, update, move, query, and delete tasks, manage sprints, and generate reports.

  Guidelines:
  - Be concise and action-oriented. Confirm what you did, not what you're about to do.
  - When a user says "move all X tasks to Y", use move_tasks or update_tasks.
  - For ambiguous requests, pick the most likely intent and execute it — mention your interpretation.
  - When referring to team members by first name, match against the members list (case-insensitive).
  - Dates: interpret relative dates ("next Friday", "end of month") based on current time.
  - For destructive actions (delete), always set confirm: false and ask for confirmation first.
  - Keep responses under 100 words unless generating a report/standup.
  - When generating standups, make them Slack-friendly with clear sections: ✅ Done, 🔄 In Progress, 🚧 Blocked.`;
}

// ============================================================
// Main AI command processor
// ============================================================
async function processCommand(command, boardContext) {
  const systemPrompt = buildSystemPrompt(boardContext);

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: command },
    ],
    tools: BOARD_TOOLS,
    tool_choice: "auto",
    max_tokens: 1024,
    temperature: 0.3,
  });

  const message = response.choices[0].message;

  return {
    text: message.content || null,
    toolCalls: message.tool_calls || [],
    usage: response.usage,
  };
}

// ============================================================
// Streaming version — for real-time typewriter effect
// ============================================================
async function streamCommand(command, boardContext, onChunk) {
  const systemPrompt = buildSystemPrompt(boardContext);

  const stream = await groq.chat.completions.stream({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: command },
    ],
    max_tokens: 1024,
    temperature: 0.4,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      fullText += delta;
      onChunk(delta);
    }
  }

  return fullText;
}

// ============================================================
// Task enrichment — AI-generate summary/priority for a task
// ============================================================
async function enrichTask(task) {
  const prompt = `Analyze this task and respond with JSON only:
  Title: ${task.title}
  Description: ${task.description || "none"}
  Type: ${task.type}

  Respond with:
  {
    "summary": "one sentence summary",
    "suggestedPriority": "critical|high|medium|low",
    "estimatedHours": <number>,
    "suggestedTags": ["tag1", "tag2"]
  }`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch {
    return null;
  }
}

// ============================================================
// Standup generator
// ============================================================
async function generateStandup(tasks, teamMember, period = "today") {
  const taskData = tasks.map((t) => ({
    title: t.title,
    status: t.status,
    assignees: t.assignees?.map((a) => a.name).join(", "),
    priority: t.priority,
    updatedAt: t.updatedAt,
  }));

  const prompt = `Generate a standup report for ${teamMember || "the entire team"} based on these tasks (${period}):

  ${JSON.stringify(taskData, null, 2)}

  Format the standup as:
  ✅ **Done**
  🔄 **In Progress**  
  🚧 **Blocked**
  📅 **Planned for tomorrow**

  Be concise. Use bullet points. Mention task names.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.5,
  });

  return response.choices[0].message.content;
}

export {
  processCommand,
  streamCommand,
  enrichTask,
  generateStandup,
  BOARD_TOOLS,
};
