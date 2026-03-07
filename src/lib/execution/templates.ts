import type { Block, Connection } from "@/types";
import { generateId } from "@/lib/id";
import { getDefaultAIConfig } from "./aiDefaults";

export interface WorkflowTemplate {
  name: string;
  description: string;
  icon: string;
  create: () => { blocks: Block[]; connections: Connection[] };
}

function makeBlock(type: Block["type"], x: number, y: number, overrides: Partial<Block>): Block {
  return {
    id: generateId(),
    type,
    position: { x, y },
    width: type === "ai-agent" ? 420 : type === "ai-viewer" ? 480 : 360,
    height: 0,
    title: "",
    content: "",
    zIndex: 1,
    ...overrides,
  };
}

function makeConnection(fromId: string, toId: string, style?: Connection["style"]): Connection {
  return { id: generateId(), fromId, toId, label: "", style };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Summarizer",
    description: "Input text \u2192 AI summarizes \u2192 View result",
    icon: "\ud83d\udcdd",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const input = makeBlock("ai-input", 100, 200, { title: "Input Text", inputConfig: { format: "text" } });
      const agent = makeBlock("ai-agent", 500, 200, {
        title: "Summarizer",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.7, maxTokens: 2048,
          systemPrompt: "You are a concise summarizer. Provide clear, well-structured summaries.",
          userPrompt: `Summarize the following text in 3-5 bullet points:\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 950, 200, {
        title: "Summary",
        viewerConfig: { renderMode: "markdown", sourceRef: `{{${agent.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agent, viewer],
        connections: [makeConnection(input.id, agent.id), makeConnection(agent.id, viewer.id)],
      };
    },
  },
  {
    name: "Translator",
    description: "Input text \u2192 Translate to target language \u2192 View",
    icon: "\ud83c\udf10",
    create: () => {
      const input = makeBlock("ai-input", 100, 200, { title: "Source Text", inputConfig: { format: "text" } });
      const defaults = getDefaultAIConfig("openai");
      const agent = makeBlock("ai-agent", 500, 200, {
        title: "Translator",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.3, maxTokens: 4096,
          systemPrompt: "You are a professional translator. Translate accurately, preserving tone and meaning.",
          userPrompt: `Translate the following text to English. If the text is already in English, translate it to Czech.\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 950, 200, {
        title: "Translation",
        viewerConfig: { renderMode: "text", sourceRef: `{{${agent.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agent, viewer],
        connections: [makeConnection(input.id, agent.id), makeConnection(agent.id, viewer.id)],
      };
    },
  },
  {
    name: "SEO Copywriter & QA",
    description: "Raw text + guidelines \u2192 SEO copy \u2192 QA check \u2192 clean HTML",
    icon: "\u270d\ufe0f",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const inputText = makeBlock("ai-input", 100, 100, { title: "Product Text", inputConfig: { format: "text" } });
      const inputGuidelines = makeBlock("ai-input", 100, 350, { title: "Brand Guidelines", inputConfig: { format: "text" }, content: "Tone: professional, friendly. Language: Czech. Avoid jargon." });
      const copywriter = makeBlock("ai-agent", 550, 100, {
        title: "Copywriter",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are an SEO copywriter. Write compelling, search-optimized product copy. Use proper heading hierarchy (H1, H2). Include relevant keywords naturally. Follow the brand guidelines provided.",
          userPrompt: `Write SEO-optimized product copy based on:\n\nProduct info:\n{{product_text}}\n\nBrand guidelines:\n{{brand_guidelines}}`,
          responseFormat: "text",
        },
      });
      const qa = makeBlock("ai-agent", 550, 350, {
        title: "QA Reviewer",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.3, maxTokens: 4096,
          systemPrompt: "You are a content QA specialist for Czech and English text. Check:\n1. Grammar, spelling, diacritics (h\u00e1\u010dky, \u010d\u00e1rky)\n2. Tone consistency with brand guidelines\n3. SEO: keyword density, heading structure, meta-readiness\n4. Readability and factual consistency\n\nReturn TWO sections:\n## Corrected Text\n(the improved text)\n## Issues Found\n(bulleted list of what you fixed and why)",
          userPrompt: `Review and fix this copy:\n\n{{copywriter}}\n\nBrand guidelines for reference:\n{{brand_guidelines}}`,
          responseFormat: "text",
        },
      });
      const htmlFormatter = makeBlock("ai-agent", 1000, 100, {
        title: "HTML Formatter",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.1, maxTokens: 4096,
          systemPrompt: "Convert the provided text into clean, semantic HTML. Use only these tags: h1, h2, h3, p, ul, ol, li, strong, em, a. Do NOT include <html>, <head>, <body>, <style>, or any inline styles. Output ONLY the HTML markup, nothing else.",
          userPrompt: `Convert this text to clean HTML:\n\n{{qa_reviewer}}`,
          responseFormat: "text",
        },
      });
      const viewerQA = makeBlock("ai-viewer", 1000, 350, {
        title: "QA Report",
        viewerConfig: { renderMode: "markdown", sourceRef: "{{qa_reviewer}}" },
      });
      const viewerHTML = makeBlock("ai-viewer", 1450, 100, {
        title: "HTML Output",
        viewerConfig: { renderMode: "html", sourceRef: "{{html_formatter}}" },
      });
      return {
        blocks: [inputText, inputGuidelines, copywriter, qa, htmlFormatter, viewerQA, viewerHTML],
        connections: [
          makeConnection(inputText.id, copywriter.id),
          makeConnection(inputGuidelines.id, copywriter.id),
          makeConnection(copywriter.id, qa.id),
          makeConnection(inputGuidelines.id, qa.id),
          makeConnection(qa.id, htmlFormatter.id),
          makeConnection(htmlFormatter.id, viewerHTML.id),
          makeConnection(qa.id, viewerQA.id),
        ],
      };
    },
  },
  {
    name: "Chain",
    description: "Input \u2192 Agent A processes \u2192 Agent B refines \u2192 View",
    icon: "\u26d3\ufe0f",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const input = makeBlock("ai-input", 100, 200, { title: "Data", inputConfig: { format: "text" } });
      const agentA = makeBlock("ai-agent", 450, 200, {
        title: "Analyzer",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are a data analyst. Extract key insights and patterns.",
          userPrompt: `Analyze the following data and list key findings:\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const agentB = makeBlock("ai-agent", 850, 200, {
        title: "Reporter",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are a report writer. Create clear, actionable reports from analysis.",
          userPrompt: `Create a structured report from these findings:\n\n{{${agentA.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 1250, 200, {
        title: "Report",
        viewerConfig: { renderMode: "markdown", sourceRef: `{{${agentB.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agentA, agentB, viewer],
        connections: [
          makeConnection(input.id, agentA.id),
          makeConnection(agentA.id, agentB.id),
          makeConnection(agentB.id, viewer.id),
        ],
      };
    },
  },
  {
    name: "Content Creator",
    description: "Product + audience \u2192 ad copy variants + social media posts",
    icon: "\ud83d\udce3",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const inputProduct = makeBlock("ai-input", 100, 100, { title: "Product Info", inputConfig: { format: "text" } });
      const inputAudience = makeBlock("ai-input", 100, 350, { title: "Target Audience", inputConfig: { format: "text" }, content: "Target: women 25-40, tone: casual & inspiring" });
      const adCopy = makeBlock("ai-agent", 550, 50, {
        title: "Ad Copy",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.9, maxTokens: 4096,
          systemPrompt: "You are a creative ad copywriter. Generate 5 ad copy variants for different platforms. For each variant include: platform name, headline, body text, and CTA. Platforms: Facebook, Google Ads, Email subject line, Instagram caption, Banner.",
          userPrompt: `Create 5 ad copy variants for:\n\nProduct:\n{{product_info}}\n\nTarget audience:\n{{target_audience}}`,
          responseFormat: "text",
        },
      });
      const socialPosts = makeBlock("ai-agent", 550, 350, {
        title: "Social Posts",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.8, maxTokens: 4096,
          systemPrompt: "You are a social media content specialist. Create platform-specific posts with appropriate tone, length, hashtags, and CTAs. Create one post for each platform: Instagram, Facebook, LinkedIn.",
          userPrompt: `Create social media posts for:\n\nProduct:\n{{product_info}}\n\nTarget audience:\n{{target_audience}}`,
          responseFormat: "text",
        },
      });
      const viewerAds = makeBlock("ai-viewer", 1000, 50, {
        title: "Ad Variants",
        viewerConfig: { renderMode: "markdown", sourceRef: "{{ad_copy}}" },
      });
      const viewerSocial = makeBlock("ai-viewer", 1000, 350, {
        title: "Social Output",
        viewerConfig: { renderMode: "markdown", sourceRef: "{{social_posts}}" },
      });
      return {
        blocks: [inputProduct, inputAudience, adCopy, socialPosts, viewerAds, viewerSocial],
        connections: [
          makeConnection(inputProduct.id, adCopy.id),
          makeConnection(inputAudience.id, adCopy.id),
          makeConnection(inputProduct.id, socialPosts.id),
          makeConnection(inputAudience.id, socialPosts.id),
          makeConnection(adCopy.id, viewerAds.id),
          makeConnection(socialPosts.id, viewerSocial.id),
        ],
      };
    },
  },
  {
    name: "Email Campaign",
    description: "Campaign brief + brand guidelines \u2192 email draft \u2192 critic review",
    icon: "\u2709\ufe0f",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const inputCampaign = makeBlock("ai-input", 100, 100, { title: "Campaign Brief", inputConfig: { format: "text" }, content: "Campaign type: product launch\nProduct: ...\nGoal: drive pre-orders" });
      const inputGuidelines = makeBlock("ai-input", 100, 350, { title: "Brand Guidelines", inputConfig: { format: "text" }, content: "Tone: professional, friendly. Max 3 paragraphs. Include one clear CTA." });
      const writer = makeBlock("ai-agent", 550, 100, {
        title: "Email Writer",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are an email marketing specialist. Write compelling marketing emails. Include:\n- 3 subject line options (with emoji variants)\n- Preview text\n- Email body with clear structure\n- Primary CTA button text\n- P.S. line",
          userPrompt: `Write a marketing email:\n\nCampaign brief:\n{{campaign_brief}}\n\nBrand guidelines:\n{{brand_guidelines}}`,
          responseFormat: "text",
        },
      });
      const critic = makeBlock("ai-agent", 550, 350, {
        title: "Email Critic",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.3, maxTokens: 4096,
          systemPrompt: "You are an email deliverability and conversion expert. Review the email and check:\n1. Spam trigger words (FREE, ACT NOW, etc.) \u2014 suggest alternatives\n2. Subject line effectiveness (length, urgency, curiosity)\n3. CTA clarity and placement\n4. Tone alignment with brand guidelines\n5. Mobile readability\n\nProvide the improved email followed by a list of changes made.",
          userPrompt: `Review this marketing email:\n\n{{email_writer}}\n\nBrand guidelines:\n{{brand_guidelines}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 1000, 200, {
        title: "Final Email",
        viewerConfig: { renderMode: "markdown", sourceRef: "{{email_critic}}" },
      });
      return {
        blocks: [inputCampaign, inputGuidelines, writer, critic, viewer],
        connections: [
          makeConnection(inputCampaign.id, writer.id),
          makeConnection(inputGuidelines.id, writer.id),
          makeConnection(writer.id, critic.id),
          makeConnection(inputGuidelines.id, critic.id),
          makeConnection(critic.id, viewer.id),
        ],
      };
    },
  },
  {
    name: "Competitor Analysis",
    description: "Competitor data + our positioning \u2192 research \u2192 SWOT & action plan",
    icon: "\ud83d\udd0d",
    create: () => {
      const defaults = getDefaultAIConfig("openai");
      const inputCompetitor = makeBlock("ai-input", 100, 100, { title: "Competitor Data", inputConfig: { format: "text" }, content: "Paste competitor product page, pricing, features, or any available info here." });
      const inputOurs = makeBlock("ai-input", 100, 350, { title: "Our Product", inputConfig: { format: "text" }, content: "Our product: ...\nPrice: ...\nUSP: ...\nTarget market: ..." });
      const researcher = makeBlock("ai-agent", 550, 100, {
        title: "Researcher",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.4, maxTokens: 4096,
          systemPrompt: "You are a competitive intelligence analyst. From the provided data, extract and organize:\n1. Product features (list with details)\n2. Pricing model and tiers\n3. Unique selling propositions\n4. Target audience\n5. Weaknesses and gaps\n6. Marketing positioning and messaging\n\nBe thorough and cite specific details from the source material.",
          userPrompt: `Analyze this competitor:\n\n{{competitor_data}}\n\nFor comparison, here is our product:\n{{our_product}}`,
          responseFormat: "text",
        },
      });
      const strategist = makeBlock("ai-agent", 550, 350, {
        title: "Strategist",
        aiConfig: {
          provider: "openai", ...defaults, temperature: 0.5, maxTokens: 4096,
          systemPrompt: "You are a product strategy consultant. Based on competitive research, provide:\n\n## SWOT Analysis\n(Strengths, Weaknesses, Opportunities, Threats \u2014 as a 2x2 table)\n\n## Positioning Gaps\n(Where competitors are weak and we can win)\n\n## Action Plan\n(5-7 specific, prioritized recommendations with effort/impact rating: \ud83d\udfe2 quick win, \ud83d\udfe1 medium effort, \ud83d\udd34 strategic investment)",
          userPrompt: `Create a strategic analysis based on this competitive research:\n\n{{researcher}}\n\nOur product info:\n{{our_product}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 1000, 200, {
        title: "Strategy Report",
        viewerConfig: { renderMode: "markdown", sourceRef: "{{strategist}}" },
      });
      return {
        blocks: [inputCompetitor, inputOurs, researcher, strategist, viewer],
        connections: [
          makeConnection(inputCompetitor.id, researcher.id),
          makeConnection(inputOurs.id, researcher.id),
          makeConnection(researcher.id, strategist.id),
          makeConnection(inputOurs.id, strategist.id),
          makeConnection(strategist.id, viewer.id),
        ],
      };
    },
  },
];
