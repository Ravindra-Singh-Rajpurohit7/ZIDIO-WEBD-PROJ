import OpenAI from 'openai';

// Initialize OpenAI client if API key is provided
const getOpenAIClient = () => {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return null;
};

/**
 * Generates meeting summary and action items from chat logs
 * @param {Array} messages - List of Message objects containing sender and text
 * @returns {Promise<{summary: string, actionItems: string[]}>}
 */
export const generateMeetingSummary = async (messages) => {
  if (!messages || messages.length === 0) {
    return {
      summary: 'No messages were sent in this meeting. Unable to generate summary.',
      actionItems: ['No action items detected.']
    };
  }

  // Format transcript
  const transcript = messages
    .map((m) => `${m.sender?.name || 'User'}: ${m.text}`)
    .join('\n');

  const openai = getOpenAIClient();

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI Meeting Assistant. Analyze the following meeting transcript. Generate a concise summary of the key discussion points and extract a list of actionable items (todos) with assignees if mentioned. Return a JSON object with keys "summary" (string) and "actionItems" (array of strings).'
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript}`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        summary: result.summary || 'Summary could not be parsed.',
        actionItems: result.actionItems || []
      };
    } catch (error) {
      console.error('OpenAI API Error, falling back to local generator:', error.message);
    }
  }

  // Fallback rule-based mock generator
  console.log('Running rule-based local meeting summary generator...');
  
  const actionItems = [];
  const discussionPoints = [];

  messages.forEach((msg) => {
    const text = msg.text.trim();
    const senderName = msg.sender?.name || 'User';

    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('todo') ||
      lowerText.includes('action item') ||
      lowerText.includes('i will') ||
      lowerText.includes('will do') ||
      lowerText.includes('please') ||
      lowerText.includes('need to') ||
      lowerText.includes('can you')
    ) {
      actionItems.push(`${senderName}: ${text}`);
    } else {
      discussionPoints.push(text);
    }
  });

  if (actionItems.length === 0) {
    actionItems.push('Coordinate project next steps between members.');
  }

  const uniquePointsCount = Math.min(discussionPoints.length, 3);
  let pointsSummary = 'general project updates';
  if (uniquePointsCount > 0) {
    pointsSummary = discussionPoints.slice(0, uniquePointsCount).map(p => `"${p}"`).join(', ');
  }

  const summary = `IntellMeet AI local summary:\n- The meeting registered active collaboration with ${messages.length} chat message(s).\n- Key discussion points included: ${pointsSummary}.\n- Action items were identified and logged for execution.`;

  return {
    summary,
    actionItems
  };
};
