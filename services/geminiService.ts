
import { GoogleGenAI, Type } from "@google/genai";
import type { Task } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function getMotivationQuote(): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a short, powerful, and inspiring motivational quote for a student who is studying hard. Maximum 20 words.',
    });
    return response.text.trim();
}

// Lightweight engagement penalty calculator (pure function)
// Reduces the score by 15 points on idle breach, but never below 0
export async function calculateIdlePenalty(currentScore: number): Promise<number> {
  const next = Math.max(0, Math.floor(currentScore - 15));
  return next;
}

export async function getDistractionAlertMessage(): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a very short, gentle, and encouraging message (max 10 words) for a student who got distracted, reminding them to focus.',
    });
    return response.text.trim();
}


export async function getAIChatResponse(history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are FocusBuddy, a friendly and encouraging AI study partner. Help students by summarizing notes, creating study plans, explaining complex topics, and keeping them motivated. If they mention feeling stressed, tired, or frustrated, offer a suggestion for a short break or a mindfulness exercise. Keep your answers concise, helpful, and supportive.",
        },
        history,
    });
    
    const response = await chat.sendMessage({ message: newMessage });
    return response.text.trim();
}

// Simple engagement challenge provider (fallback).
export async function getEngagementChallenge(): Promise<any> {
    // Return a random lightweight challenge from a small local pool.
    const pool = [
        { type: 'joke', question: "Why did the student bring a ladder to class?", punchline: "Because they were going to high school!" },
        { type: 'joke', question: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
        { type: 'joke', question: "What do you call fake spaghetti?", punchline: "An impasta." },
        { type: 'fun_fact', fact: "Honey never spoils — archaeologists found edible honey in ancient tombs." },
        { type: 'fun_fact', fact: "Bananas are berries but strawberries aren't." },
        { type: 'counting', question: 'How many shapes do you see?', imageUrl: 'https://placehold.co/600x400?text=Count+the+shapes', correctAnswer: 5 }
    ];
    const choice = pool[Math.floor(Math.random() * pool.length)];
    return choice;
}

export async function getPrioritizedTasks(tasks: Task[]): Promise<Task[]> {
  const taskDescriptions = tasks.map(t => `- ${t.text} (Subject: ${t.subject}, Due: ${t.deadline}, Completed: ${t.completed})`).join('\n');
  const prompt = `Here is a list of tasks for a student:\n${taskDescriptions}\n\nPlease analyze these tasks and return a prioritized list. Consider deadlines and the likely effort involved. Return ONLY the JSON array of tasks, sorted by priority. Do not include any other text or markdown formatting. The JSON schema for each task object should be: { "id": number, "text": string, "subject": string, "completed": boolean, "deadline": string }`;

  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      id: { type: Type.NUMBER },
                      text: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN },
                      deadline: { type: Type.STRING },
                  },
                  required: ["id", "text", "subject", "completed", "deadline"],
              },
          },
      },
  });

  const jsonStr = response.text.trim();
  try {
      const prioritizedTasks: Task[] = JSON.parse(jsonStr);
      
      const originalTaskMap = new Map(tasks.map(t => [t.text, t]));
      const sanitizedTasks = prioritizedTasks.map(pt => {
        const originalTask = originalTaskMap.get(pt.text);
        return originalTask ? { ...pt, id: originalTask.id } : pt;
      }).filter(Boolean) as Task[]; 

      const returnedTexts = new Set(sanitizedTasks.map(t => t.text));
      tasks.forEach(originalTask => {
        if (!returnedTexts.has(originalTask.text)) {
          sanitizedTasks.push(originalTask);
        }
      });

      return sanitizedTasks;

  } catch (error) {
      console.error("Failed to parse prioritized tasks JSON:", error);
      return [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }
}