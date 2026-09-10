import MetaAdsConfig from '../models/MetaAdsConfig.js';
import Lead from '../models/Lead.js';
import { getNextSalesTeamMember } from './roundRobinService.js';

/**
 * Retrieve or initialize Meta Ads configuration
 */
export const getMetaConfig = async () => {
  let config = await MetaAdsConfig.findOne();
  if (!config) {
    config = await MetaAdsConfig.create({
      enabled: true,
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'krishna_valley_meta_lead_token_2026',
      pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || '',
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      pageId: process.env.META_PAGE_ID || '',
      formId: process.env.META_FORM_ID || '',
      autoRoundRobin: true,
      defaultSource: 'meta_ads',
    });
  }
  return config;
};

/**
 * Update Meta Ads configuration
 */
export const updateMetaConfig = async (updateData) => {
  let config = await MetaAdsConfig.findOne();
  if (!config) {
    config = new MetaAdsConfig(updateData);
  } else {
    Object.assign(config, updateData);
  }
  await config.save();
  return config;
};

/**
 * Verify Webhook Hub Challenge for Meta App Dashboard
 */
export const verifyMetaWebhook = async (mode, token, challenge) => {
  const config = await getMetaConfig();
  const expectedToken = config.verifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN || 'krishna_valley_meta_lead_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return challenge;
  }
  return null;
};

/**
 * Clean and format field names into human-readable question labels
 */
const formatQuestionLabel = (rawName) => {
  if (!rawName) return 'Custom Question';
  return rawName
    .replace(/[?_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Parse Meta field_data array into standard client fields and custom questions
 */
export const parseMetaFieldData = (fieldData = []) => {
  const result = {
    name: '',
    mobileNo: '',
    email: '',
    city: '',
    state: '',
    country: 'India',
    address: '',
    pincode: '',
    requirement: '2BHK Apartment',
    budget: 0,
    metaCustomQuestions: [],
  };

  let firstName = '';
  let lastName = '';

  (fieldData || []).forEach((item) => {
    const key = (item.name || '').toLowerCase().trim();
    const rawVal = Array.isArray(item.values) ? item.values[0] : item.values;
    const val = typeof rawVal === 'string' ? rawVal.trim() : (rawVal || '');

    if (!val) return;

    if (key === 'full_name' || key === 'name') {
      result.name = val;
    } else if (key === 'first_name') {
      firstName = val;
    } else if (key === 'last_name') {
      lastName = val;
    } else if (key === 'phone_number' || key === 'phone' || key === 'mobile_number' || key === 'mobile') {
      result.mobileNo = val;
    } else if (key === 'email' || key === 'email_address') {
      result.email = val.toLowerCase();
    } else if (key === 'city') {
      result.city = val;
    } else if (key === 'state' || key === 'province' || key === 'region') {
      result.state = val;
    } else if (key === 'country') {
      result.country = val;
    } else if (key === 'street_address' || key === 'address') {
      result.address = val;
    } else if (key === 'zip_code' || key === 'post_code' || key === 'pincode' || key === 'postal_code') {
      result.pincode = val;
    } else {
      // Custom questions asked on the Meta Instant Form (e.g., BHK preference, budget, timeline)
      const questionText = formatQuestionLabel(item.name);

      // Check if this question is asking for BHK or budget
      if (key.includes('bhk') || key.includes('requirement') || key.includes('unit')) {
        result.requirement = val;
      }
      if (key.includes('budget') || key.includes('price')) {
        const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > 0) result.budget = num;
      }

      result.metaCustomQuestions.push({
        fieldKey: item.name,
        question: questionText,
        answer: val,
      });
    }
  });

  if (!result.name && (firstName || lastName)) {
    result.name = `${firstName} ${lastName}`.trim();
  }

  return result;
};

/**
 * Fetch lead details from Meta Graph API using leadgen_id
 */
export const fetchMetaLeadFromGraphApi = async (leadgenId, pageAccessToken) => {
  try {
    const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${encodeURIComponent(pageAccessToken)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Meta Graph API returned status ${response.status}: ${errBody}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching lead from Meta Graph API:', error.message);
    throw error;
  }
};

/**
 * Ingest and process an incoming Meta Ad Lead (Webhook or Direct API)
 * Automatically assigns 1-by-1 sequentially to the sales team via Round-Robin.
 */
export const ingestMetaLead = async ({
  leadgenId,
  formId,
  formName,
  pageId,
  campaignId,
  campaignName,
  adSetId,
  adSetName,
  adId,
  adName,
  platform = 'meta',
  fieldData = [],
  rawPayload = null,
}) => {
  const config = await getMetaConfig();

  // 1. Check if lead with this leadgenId already exists
  if (leadgenId) {
    const existing = await Lead.findOne({ 'metaAdDetails.leadgenId': leadgenId });
    if (existing) {
      console.log(`Meta lead with leadgenId ${leadgenId} already ingested. Skipping duplicate.`);
      return { lead: existing, isDuplicate: true };
    }
  }

  let finalFieldData = fieldData;

  // 2. If fieldData is empty and leadgenId + access token are available, fetch from Graph API
  if ((!finalFieldData || finalFieldData.length === 0) && leadgenId && config.pageAccessToken) {
    try {
      const graphData = await fetchMetaLeadFromGraphApi(leadgenId, config.pageAccessToken);
      if (graphData && graphData.field_data) {
        finalFieldData = graphData.field_data;
        if (!formId && graphData.form_id) formId = graphData.form_id;
        if (!adId && graphData.ad_id) adId = graphData.ad_id;
      }
    } catch (err) {
      console.warn('Could not fetch from Meta Graph API, proceeding with available fields:', err.message);
    }
  }

  // 3. Parse fields into standard client details + custom question boxes
  const parsed = parseMetaFieldData(finalFieldData);

  // Fallback defaults if missing
  const leadName = parsed.name || `Meta Prospect #${leadgenId ? leadgenId.slice(-4) : Date.now().toString().slice(-4)}`;
  const mobileNo = parsed.mobileNo || `99999${Math.floor(10000 + Math.random() * 90000)}`;

  // 4. Sequential 1-by-1 Alternating Round-Robin Assignment
  let assignedTo = null;
  let assignedAt = null;
  const assignmentHistory = [];

  if (config.autoRoundRobin) {
    try {
      const nextInQueue = await getNextSalesTeamMember();
      if (nextInQueue && nextInQueue.user) {
        assignedTo = nextInQueue.user._id;
        assignedAt = new Date();
        assignmentHistory.push({
          assignedTo: nextInQueue.user._id,
          assignedAt: new Date(),
          reason: 'Meta Ads Auto-Assignment (Sequential 1-by-1 Round-Robin)',
        });
        console.log(`⚡ Meta lead auto-assigned to @${nextInQueue.user.username} via 1-by-1 Round-Robin`);
      }
    } catch (assignErr) {
      console.error('Error during round-robin assignment for Meta lead:', assignErr);
    }
  }

  // 5. Create the Lead in the CRM database
  const newLead = await Lead.create({
    name: leadName,
    mobileNo,
    email: parsed.email || undefined,
    city: parsed.city,
    state: parsed.state,
    country: parsed.country || 'India',
    address: parsed.address,
    pincode: parsed.pincode,
    requirement: parsed.requirement,
    budget: parsed.budget || 0,
    leadSource: 'meta_ads',
    status: 'new',
    assignedTo,
    assignedAt,
    assignmentHistory,
    metaAdDetails: {
      leadgenId: leadgenId || `sim_${Date.now()}`,
      formId: formId || '',
      formName: formName || 'Meta Instant Lead Form',
      pageId: pageId || config.pageId || '',
      campaignId: campaignId || '',
      campaignName: campaignName || 'Krishna Valley Digital Campaign',
      adSetId: adSetId || '',
      adSetName: adSetName || 'Luxury Apartments Audience',
      adId: adId || '',
      adName: adName || 'Meta Feed Ad',
      platform,
      createdTime: new Date(),
    },
    metaCustomQuestions: parsed.metaCustomQuestions,
    rawMetaPayload: rawPayload || { finalFieldData },
    followUps: [
      {
        date: new Date(),
        mode: 'call',
        status: 'pending',
        notes: `New lead generated from Meta Ads (${formName || 'Instant Form'}). Follow up immediately.`,
        nextFollowUpDate: new Date(Date.now() + 2 * 3600 * 1000), // Today in 2 hours
      },
    ],
  });

  // 6. Update Meta config metrics
  config.totalLeadsReceived = (config.totalLeadsReceived || 0) + 1;
  config.lastLeadReceivedAt = new Date();
  await config.save();

  // Populate assignee for response
  const populated = await Lead.findById(newLead._id).populate('assignedTo', 'firstName lastName username email mobileNo roleId');
  return { lead: populated, isDuplicate: false };
};

/**
 * Ingest a simulated or test Meta Ad lead from the frontend modal
 */
export const createTestMetaLead = async (testData = {}) => {
  const sampleQuestions = [
    {
      name: 'what_is_your_preferred_bhk?',
      values: [testData.requirement || '3 BHK Luxury Apartment'],
    },
    {
      name: 'budget_range',
      values: [testData.budget ? `₹${testData.budget}` : '₹65 Lakh - ₹85 Lakh'],
    },
    {
      name: 'purchase_timeline',
      values: [testData.timeline || 'Within 30 Days'],
    },
    {
      name: 'preferred_payment_plan',
      values: [testData.paymentPlan || 'Construction Linked / Bank Loan'],
    },
    {
      name: 'purpose_of_purchase',
      values: [testData.purpose || 'Self Use / Family Home'],
    },
  ];

  const fieldData = [
    { name: 'full_name', values: [testData.name || 'Aditi Sengupta'] },
    { name: 'phone_number', values: [testData.mobileNo || `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`] },
    { name: 'email', values: [testData.email || `aditi.sengupta_${Date.now().toString().slice(-4)}@gmail.com`] },
    { name: 'city', values: [testData.city || 'Raipur'] },
    { name: 'state', values: [testData.state || 'Chhattisgarh'] },
    { name: 'country', values: [testData.country || 'India'] },
    ...sampleQuestions,
    ...(testData.additionalQuestions || []),
  ];

  return await ingestMetaLead({
    leadgenId: `test_meta_${Date.now()}`,
    formId: testData.formId || 'form_krishna_valley_2026',
    formName: testData.formName || 'Krishna Valley Luxury Homes Instant Form',
    campaignName: testData.campaignName || 'Meta Ads Spring 2026 Campaign',
    adSetName: testData.adSetName || 'Premium Buyers 30-55',
    adName: testData.adName || '3BHK Video Ad - Instagram & Facebook',
    platform: testData.platform || 'ig',
    fieldData,
    rawPayload: { testMode: true, submittedAt: new Date() },
  });
};
