const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Groq client (optional - only if package is installed)
let Groq;
let groq;

try {
  Groq = require('groq-sdk');
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
  });
} catch (error) {
  console.warn('⚠️  Groq SDK not available. AI features will be disabled.');
  console.warn('   Install with: npm install groq-sdk');
  groq = null;
}

// AI Post Suggestions
router.post('/suggest-post', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured. Please add GROQ_API_KEY to .env file and install groq-sdk package.' 
      });
    }

    const { topic, mood } = req.body;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a creative social media content assistant. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: `Generate 3 creative post suggestions about "${topic || 'professional growth'}" with a ${mood || 'motivational'} tone. Each suggestion should be unique and engaging (1-2 sentences). Return ONLY a valid JSON array with this exact format: [{"title": "Title 1", "content": "Post content 1"}, {"title": "Title 2", "content": "Post content 2"}, {"title": "Title 3", "content": "Post content 3"}]`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 500,
    });

    let responseText = completion.choices[0]?.message?.content || '[]';
    
    // Try to extract JSON from response if it contains text
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    let suggestions;
    try {
      suggestions = JSON.parse(responseText);
      // Ensure it's an array
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (error) {
      console.error('JSON parse error, response was:', responseText);
      // Fallback: create suggestions from the text
      suggestions = [
        { title: 'Suggestion 1', content: responseText.substring(0, 100) },
        { title: 'Suggestion 2', content: responseText.substring(100, 200) },
        { title: 'Suggestion 3', content: responseText.substring(200, 300) }
      ];
    }
    
    res.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({ message: 'Failed to generate suggestions', error: error.message });
  }
});

// AI Content Enhancement
router.post('/enhance-post', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional content editor. Enhance the given post to make it more engaging, clear, and professional while maintaining the original tone and meaning. Keep it concise and authentic.',
        },
        {
          role: 'user',
          content: `Enhance this post content: "${content}". Return only the enhanced version without explanations.`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 300,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim();
    
    res.json({ enhanced });
  } catch (error) {
    console.error('AI enhancement error:', error);
    res.status(500).json({ message: 'Failed to enhance content', error: error.message });
  }
});

// AI Smart Reply Suggestions
router.post('/suggest-reply', auth, async (req, res) => {
  try {
    const { postContent, context } = req.body;

    if (!postContent) {
      return res.status(400).json({ message: 'Post content is required' });
    }

    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: `Generate 3 thoughtful, short reply suggestions (1 sentence each) for this post: "${postContent}". ${context ? `Context: ${context}` : ''} Return ONLY a valid JSON array of strings in this exact format: ["reply 1", "reply 2", "reply 3"]`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 300,
    });

    let responseText = completion.choices[0]?.message?.content || '[]';
    
    // Try to extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    let replies;
    try {
      replies = JSON.parse(responseText);
      if (!Array.isArray(replies)) {
        // If it's not an array, try to split by lines or create array
        replies = typeof replies === 'string' ? [replies] : [];
      }
    } catch (error) {
      console.error('JSON parse error for replies, response was:', responseText);
      // Fallback: split by newlines or create array from text
      replies = responseText.split('\n').filter(line => line.trim()).slice(0, 3);
      if (replies.length === 0) {
        replies = [responseText.substring(0, 100)];
      }
    }
    
    res.json({ replies });
  } catch (error) {
    console.error('AI reply suggestion error:', error);
    res.status(500).json({ message: 'Failed to generate replies', error: error.message });
  }
});

// AI Content Analysis
router.post('/analyze-content', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a content analyst. Analyze the given post and provide insights about tone, engagement potential, and suggestions. Be concise and actionable.',
        },
        {
          role: 'user',
          content: `Analyze this post: "${content}". Provide a JSON object with: tone (string), engagementScore (number 1-10), suggestions (array of strings).`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 400,
    });

    let responseText = completion.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON object from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (error) {
      console.error('JSON parse error for analysis, response was:', responseText);
      // Fallback analysis
      analysis = {
        tone: 'neutral',
        engagementScore: 5,
        suggestions: ['Consider adding more engaging content']
      };
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze content', error: error.message });
  }
});

// AI Resume Analyzer
router.post('/analyze-resume', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const { resumeText, jobDescription } = req.body;

    if (!resumeText) {
      return res.status(400).json({ message: 'Resume text is required' });
    }

    const prompt = jobDescription 
      ? `Analyze this resume and provide feedback tailored to this job description: "${jobDescription}". Resume: "${resumeText}".`
      : `Analyze this resume and provide comprehensive feedback: "${resumeText}".`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume analyst and career advisor. Analyze resumes and provide detailed, actionable feedback. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: `${prompt} Return ONLY a valid JSON object with this exact structure: {
            "overallScore": 85,
            "strengths": ["strength 1", "strength 2", "strength 3"],
            "weaknesses": ["weakness 1", "weakness 2"],
            "missingSections": ["section 1", "section 2"],
            "atsCompatibility": {
              "score": 80,
              "issues": ["issue 1", "issue 2"],
              "suggestions": ["suggestion 1", "suggestion 2"]
            },
            "improvements": [
              {"category": "Formatting", "suggestion": "Improve formatting"},
              {"category": "Content", "suggestion": "Add more details"}
            ],
            "summary": "Brief overall summary of the resume"
          }`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 1500,
    });

    let responseText = completion.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON object from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    let analysis;
    try {
      analysis = JSON.parse(responseText);
      // Ensure required fields exist
      if (!analysis.overallScore) analysis.overallScore = 0;
      if (!analysis.strengths) analysis.strengths = [];
      if (!analysis.weaknesses) analysis.weaknesses = [];
      if (!analysis.missingSections) analysis.missingSections = [];
      if (!analysis.atsCompatibility) {
        analysis.atsCompatibility = {
          score: 0,
          issues: [],
          suggestions: []
        };
      }
      if (!analysis.improvements) analysis.improvements = [];
      if (!analysis.summary) analysis.summary = 'Analysis completed.';
    } catch (error) {
      console.error('JSON parse error for resume analysis, response was:', responseText);
      // Fallback analysis
      analysis = {
        overallScore: 50,
        strengths: ['Resume structure is present'],
        weaknesses: ['Could use more detail'],
        missingSections: [],
        atsCompatibility: {
          score: 50,
          issues: ['May need formatting improvements'],
          suggestions: ['Consider using standard resume format']
        },
        improvements: [
          { category: 'General', suggestion: 'Add more specific achievements and metrics' }
        ],
        summary: 'Resume analysis completed. Consider adding more details and achievements.'
      };
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('AI resume analysis error:', error);
    res.status(500).json({ message: 'Failed to analyze resume', error: error.message });
  }
});

// AI Career Assistant Chatbot
router.post('/career-chat', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const { message, conversationHistory } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a friendly and knowledgeable career assistant chatbot. Your name is Careerly Assistant. You help users with:
- Career advice and guidance
- Job search tips and strategies
- Interview preparation
- Resume and cover letter help
- Networking advice
- Skill development recommendations
- Industry insights
- Salary negotiation tips
- Career transitions

Be conversational, empathetic, and provide practical, actionable advice. Keep responses concise but helpful (2-4 sentences typically, longer when needed for complex topics). Use a warm, professional tone.`,
      },
    ];

    // Add conversation history if provided (last 10 messages to keep context manageable)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message.trim(),
    });

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content?.trim() || 'I apologize, but I couldn\'t generate a response. Please try again.';
    
    res.json({ 
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI career chat error:', error);
    res.status(500).json({ message: 'Failed to get response', error: error.message });
  }
});

// Smart Connection Recommendations
router.get('/recommend-connections', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const User = require('../models/User');
    const currentUser = await User.findById(req.user._id)
      .select('name bio skills experience education connections connectionRequests');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all users except current user and existing connections
    const excludedIds = [
      currentUser._id,
      ...currentUser.connections.map(c => c.toString()),
      ...currentUser.connectionRequests.map(cr => cr.user?.toString() || cr.user).filter(Boolean),
    ];

    const allUsers = await User.find({
      _id: { $nin: excludedIds },
    })
      .select('name bio skills experience education profilePicture')
      .limit(50); // Limit for AI processing

    if (allUsers.length === 0) {
      return res.json({ recommendations: [] });
    }

    // Build user profile summary for AI
    const userProfile = {
      name: currentUser.name,
      bio: currentUser.bio || '',
      skills: currentUser.skills || [],
      experience: currentUser.experience?.map(exp => ({
        title: exp.title,
        company: exp.company,
        description: exp.description,
      })) || [],
      education: currentUser.education?.map(edu => ({
        degree: edu.degree,
        field: edu.field,
        school: edu.school,
      })) || [],
    };

    // Build potential connections summary
    const potentialConnections = allUsers.map(user => ({
      id: user._id.toString(),
      name: user.name,
      bio: user.bio || '',
      skills: user.skills || [],
      experience: user.experience?.map(exp => ({
        title: exp.title,
        company: exp.company,
      })) || [],
      education: user.education?.map(edu => ({
        degree: edu.degree,
        field: edu.field,
      })) || [],
    }));

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional networking assistant. Analyze user profiles and recommend the best connections based on shared skills, similar industries, complementary expertise, or mutual interests. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: `User Profile: ${JSON.stringify(userProfile)}

Potential Connections: ${JSON.stringify(potentialConnections)}

Analyze these profiles and recommend the top 5-10 best connections for the user. Consider:
- Shared skills and expertise
- Similar industries or roles
- Complementary skills
- Educational background
- Career level compatibility

Return ONLY a valid JSON array of user IDs in order of recommendation (most relevant first), like: ["user_id_1", "user_id_2", "user_id_3"]`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 500,
    });

    let responseText = completion.choices[0]?.message?.content || '[]';
    
    // Extract JSON array
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    let recommendedIds;
    try {
      recommendedIds = JSON.parse(responseText);
      if (!Array.isArray(recommendedIds)) {
        recommendedIds = [];
      }
    } catch (error) {
      console.error('JSON parse error for recommendations:', responseText);
      // Fallback: use simple matching based on skills
      recommendedIds = allUsers
        .filter(user => {
          const userSkills = user.skills || [];
          const currentSkills = currentUser.skills || [];
          return userSkills.some(skill => 
            currentSkills.some(cs => 
              cs.toLowerCase().includes(skill.toLowerCase()) || 
              skill.toLowerCase().includes(cs.toLowerCase())
            )
          );
        })
        .slice(0, 10)
        .map(user => user._id.toString());
    }

    // Get recommended users with full details
    const recommendedUsers = allUsers
      .filter(user => recommendedIds.includes(user._id.toString()))
      .sort((a, b) => {
        const indexA = recommendedIds.indexOf(a._id.toString());
        const indexB = recommendedIds.indexOf(b._id.toString());
        return indexA - indexB;
      })
      .map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        skills: user.skills,
        experience: user.experience,
        education: user.education,
      }));

    res.json({ recommendations: recommendedUsers });
  } catch (error) {
    console.error('AI connection recommendation error:', error);
    res.status(500).json({ message: 'Failed to get recommendations', error: error.message });
  }
});

// Smart Job Recommendations
router.get('/recommend-jobs', auth, async (req, res) => {
  try {
    if (!groq || !process.env.GROQ_API_KEY) {
      return res.status(503).json({ 
        message: 'AI service not configured' 
      });
    }

    const User = require('../models/User');
    const currentUser = await User.findById(req.user._id)
      .select('name bio skills experience education');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build user profile summary
    const userProfile = {
      name: currentUser.name,
      bio: currentUser.bio || '',
      skills: currentUser.skills || [],
      experience: currentUser.experience?.map(exp => ({
        title: exp.title,
        company: exp.company,
        description: exp.description,
        current: exp.current,
      })) || [],
      education: currentUser.education?.map(edu => ({
        degree: edu.degree,
        field: edu.field,
        school: edu.school,
      })) || [],
    };

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a career advisor and job matching expert. Analyze user profiles and recommend relevant job opportunities. Always respond with valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: `User Profile: ${JSON.stringify(userProfile)}

Based on this profile, recommend 5-8 relevant job opportunities. For each job, provide:
- Job Title
- Company Type/Industry
- Required Skills (3-5)
- Job Description (2-3 sentences)
- Why it's a good match (1-2 sentences)

Return ONLY a valid JSON array with this exact format:
[
  {
    "title": "Software Engineer",
    "company": "Tech Company",
    "industry": "Technology",
    "requiredSkills": ["JavaScript", "React", "Node.js"],
    "description": "Job description here...",
    "matchReason": "Why this matches the user..."
  }
]`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 1500,
    });

    let responseText = completion.choices[0]?.message?.content || '[]';
    
    // Extract JSON array
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }

    let jobRecommendations;
    try {
      jobRecommendations = JSON.parse(responseText);
      if (!Array.isArray(jobRecommendations)) {
        jobRecommendations = [];
      }
    } catch (error) {
      console.error('JSON parse error for job recommendations:', responseText);
      // Fallback recommendations
      jobRecommendations = [
        {
          title: 'Software Developer',
          company: 'Tech Company',
          industry: 'Technology',
          requiredSkills: currentUser.skills?.slice(0, 3) || ['Programming', 'Problem Solving'],
          description: 'A role that matches your skills and experience.',
          matchReason: 'Your skills align well with this position.',
        },
      ];
    }

    res.json({ recommendations: jobRecommendations });
  } catch (error) {
    console.error('AI job recommendation error:', error);
    res.status(500).json({ message: 'Failed to get job recommendations', error: error.message });
  }
});

module.exports = router;

