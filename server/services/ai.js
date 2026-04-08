const OpenAI = require("openai");

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your .env file to use AI features.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const PROPOSAL_SYSTEM_PROMPT = `You are an expert freelance proposal writer. Given a project description, client name, and any extra context, generate a professional project proposal.

Return ONLY valid JSON with this structure:
{
  "title": "Proposal title",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content in markdown format",
      "order": 0
    }
  ],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What gets delivered",
      "dueDate": "Week 1",
      "amount": 500
    }
  ],
  "totalAmount": 2000
}

Required sections (in order):
1. Executive Summary — 2-3 sentences hooking the client
2. Project Scope — what's included (and not included)
3. Deliverables — bullet list of tangible outputs
4. Timeline & Milestones — phased delivery plan
5. Investment — pricing breakdown with justification
6. Terms & Conditions — payment terms, revisions, IP ownership
7. Next Steps — clear call to action

Rules:
- Be specific and professional, not generic
- Use the client's name naturally
- Milestones should have realistic amounts that sum to totalAmount
- If no budget is mentioned, estimate a fair market rate
- Keep each section concise but thorough
- Use markdown formatting in content (bold, bullets, etc.)`;

async function generateProposal(projectDescription, clientName, clientCompany, currency = "USD") {
  const userContent = `Client: ${clientName}${clientCompany ? ` (${clientCompany})` : ""}
Currency: ${currency}

Project Description:
${projectDescription}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PROPOSAL_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 3000,
  });

  return JSON.parse(response.choices[0].message.content);
}

const REFINE_SYSTEM_PROMPT = `You are a proposal editor. The user wants to refine a specific section of their proposal. 
Return ONLY valid JSON: { "title": "Section title", "content": "Updated content in markdown" }
Keep the same professional tone. Only change what was requested.`;

async function refineSection(sectionTitle, currentContent, instruction) {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Section: ${sectionTitle}\n\nCurrent content:\n${currentContent}\n\nInstruction: ${instruction}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 1000,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { generateProposal, refineSection };
