import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groq
}

export const TRIAGE_SYSTEM_PROMPT = `You are a medical triage assistant for a rural telehealth platform in India.
Your role is to:
1. Listen to the patient's symptoms with empathy
2. Ask relevant follow-up questions to understand severity
3. Assess urgency: Emergency (call ambulance), Urgent (book doctor today), Routine (book within a week)
4. Provide basic first-aid advice while they wait
5. Summarize the case for the doctor when consultation is booked

Keep responses simple and clear. The patient may have low health literacy.
Always recommend consulting a real doctor — never replace medical advice.
If symptoms suggest a medical emergency, immediately advise calling emergency services.

Patient context will be provided below when available.`

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function chatWithTriage(
  messages: Message[],
  patientContext?: string
): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: patientContext
      ? `${TRIAGE_SYSTEM_PROMPT}\n\nPatient History:\n${patientContext}`
      : TRIAGE_SYSTEM_PROMPT,
  }

  const completion = await getGroqClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [systemMessage, ...messages],
    temperature: 0.3,
    max_tokens: 500,
  })

  return completion.choices[0]?.message?.content ?? 'Sorry, I could not process your request.'
}
