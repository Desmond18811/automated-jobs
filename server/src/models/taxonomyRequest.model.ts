import { Schema, model } from 'mongoose';

/** A role, industry or skill a candidate couldn't find during onboarding. Reviewed by hand. */
export interface ITaxonomyRequest {
  role_name?: string;
  industry_name?: string;
  skill_name?: string;
  context?: string;
  email?: string;
}

const schema = new Schema<ITaxonomyRequest>(
  {
    role_name: String,
    industry_name: String,
    skill_name: String,
    context: String,
    email: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const TaxonomyRequest = model<ITaxonomyRequest>('TaxonomyRequest', schema);
