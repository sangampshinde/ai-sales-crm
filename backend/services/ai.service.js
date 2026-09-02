import { GoogleGenAI } from "@google/genai";

let aiConfigured = false;
let ai = null;

if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  aiConfigured = true;
}

const getModel = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";

const callWithTimeout = (promise, ms = 6000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI generation timed out after ${ms}ms`)), ms)
    ),
  ]);
};

export const isAiConfigured = () => aiConfigured;

export const generateLeadSummary = async (lead) => {
  if (!aiConfigured) {
    return {
      summary: `${lead.name} from ${lead.company || "lead"} is currently in the ${lead.status} stage with $${lead.value || 0} deal value.`,
      riskScore: lead.priority === "High" ? 25 : lead.priority === "Medium" ? 45 : 70,
      suggestedPriority: lead.priority || "Medium",
      nextBestAction: "Schedule a follow-up call to discuss scope and timelines.",
    };
  }

  const prompt = `Analyze this sales lead and provide an executive summary, a risk score (0-100 where lower is better/healthier), a suggested priority ("High", "Medium", or "Low"), and the next best action.
Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || "N/A"}
- Email: ${lead.email || "N/A"}
- Status: ${lead.status}
- Priority: ${lead.priority}
- Value: $${lead.value || 0}

Respond ONLY with a JSON object in this exact format:
{
  "summary": "2-3 concise sentences analyzing the lead status and strategic fit.",
  "riskScore": 35,
  "suggestedPriority": "High",
  "nextBestAction": "Actionable next step recommendation"
}`;

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: getModel(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      })
    );

    const parsed = JSON.parse(response.text);
    return {
      summary: parsed.summary || "Summary generated.",
      riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 40,
      suggestedPriority: parsed.suggestedPriority || lead.priority || "Medium",
      nextBestAction: parsed.nextBestAction || "Follow up with client.",
    };
  } catch (err) {
    console.error("AI Lead Summary Error:", err);
    return {
      summary: `${lead.name} (${lead.company || "Client"}) is in ${lead.status} stage with deal value $${lead.value || 0}.`,
      riskScore: lead.priority === "High" ? 20 : lead.priority === "Medium" ? 45 : 65,
      suggestedPriority: lead.priority || "High",
      nextBestAction: `Reach out to ${lead.name} to confirm milestone deliverables and next steps.`,
    };
  }
};

export const generateEmail = async ({ lead, purpose, tone, senderName, senderCompany }) => {
  if (!aiConfigured) {
    return {
      subject: `Follow up regarding ${lead.company || "our discussion"}`,
      body: `Hi ${lead.name},\n\nI hope you're doing well. Following up on our recent conversation regarding ${lead.company}.\n\nBest regards,\n${senderName}\n${senderCompany || "Sales CRM"}`,
    };
  }

  const prompt = `Draft a ${tone} email to ${lead.name} at ${lead.company || "their company"}.
The purpose of the email is: ${purpose}.
The sender is ${senderName} from ${senderCompany || "Sales CRM"}.
Lead details: status: ${lead.status}, priority: ${lead.priority}, deal value: $${lead.value || 0}.

Respond ONLY with a JSON object in this exact format:
{
  "subject": "Clear, engaging email subject line",
  "body": "Complete professional email body"
}`;

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: getModel(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      })
    );

    const parsed = JSON.parse(response.text);
    return {
      subject: parsed.subject || `Follow up: ${lead.company || lead.name}`,
      body: parsed.body || `Hi ${lead.name},\n\nFollowing up on our discussions.\n\nBest,\n${senderName}`,
    };
  } catch (err) {
    console.error("AI Email Error:", err);
    return {
      subject: `Following up on our partnership with ${lead.company || lead.name}`,
      body: `Hi ${lead.name},\n\nI wanted to check in regarding the next steps for ${lead.company || "your team"}. Looking forward to connecting soon.\n\nBest regards,\n${senderName}\n${senderCompany || "Sales CRM"}`,
    };
  }
};

export const generateSalesInsights = async (stats) => {
  if (!aiConfigured) {
    return {
      healthScore: 78,
      headline: "Healthy pipeline with positive deal progression across stages.",
      insights: [
        "Consistent movement from New to Qualified leads.",
        "High average deal value in proposal stage accounts.",
        "Strong overall win rate with active opportunities.",
      ],
      recommendations: [
        "Prioritize proposals with high deal values closing this quarter.",
        "Set automated follow-up reminders for stalled leads.",
        "Engage decision-makers early in the qualification stage.",
      ],
    };
  }

  const prompt = `Analyze these CRM pipeline statistics and generate strategic sales insights.
Pipeline Stats:
- Total Leads: ${stats.totalLeads}
- Total Pipeline Value: $${stats.totalPipelineValue}
- Win Rate: ${stats.winRate}%
- Stages Breakdown: ${JSON.stringify(stats.stages)}

Respond ONLY with a JSON object in this exact format:
{
  "healthScore": 82,
  "headline": "One sentence summary of current pipeline health",
  "insights": [
    "First concrete observation based on data",
    "Second concrete observation",
    "Third concrete observation"
  ],
  "recommendations": [
    "First actionable step for sales reps",
    "Second actionable step",
    "Third actionable step"
  ]
}`;

  try {
    const response = await callWithTimeout(
      ai.models.generateContent({
        model: getModel(),
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      })
    );

    const parsed = JSON.parse(response.text);
    return {
      healthScore: typeof parsed.healthScore === "number" ? parsed.healthScore : 75,
      headline: parsed.headline || "Pipeline momentum remains stable.",
      insights: Array.isArray(parsed.insights) ? parsed.insights : ["Active deals progressing well."],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ["Continue regular cadence of client follow-ups."],
    };
  } catch (err) {
    console.error("AI Insights Error:", err);
    return {
      healthScore: 75,
      headline: "Pipeline volume is steady with multiple high-value opportunities.",
      insights: [
        `Pipeline contains ${stats.totalLeads} active leads valued at $${stats.totalPipelineValue || 0}.`,
        "Win rate demonstrates steady close conversions.",
        "Proposal stage represents majority of near-term potential revenue.",
      ],
      recommendations: [
        "Focus on closing highest value proposals this week.",
        "Schedule follow-ups for newly qualified leads.",
        "Maintain quick response times on inbound inquiries.",
      ],
    };
  }
};
