import mongoose from 'mongoose';

const metaAdsConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    appId: {
      type: String,
      trim: true,
      default: '',
    },
    appSecret: {
      type: String,
      trim: true,
      default: '',
    },
    pageAccessToken: {
      type: String,
      trim: true,
      default: '',
    },
    pageId: {
      type: String,
      trim: true,
      default: '',
    },
    formId: {
      type: String,
      trim: true,
      default: '',
    },
    verifyToken: {
      type: String,
      trim: true,
      default: 'krishna_valley_meta_lead_token_2026',
    },
    autoRoundRobin: {
      type: Boolean,
      default: true,
    },
    defaultSource: {
      type: String,
      default: 'meta_ads',
    },
    lastLeadReceivedAt: {
      type: Date,
    },
    totalLeadsReceived: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const MetaAdsConfig = mongoose.model('MetaAdsConfig', metaAdsConfigSchema);

export default MetaAdsConfig;
