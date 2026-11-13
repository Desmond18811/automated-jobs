import type { Salary } from '../models/jobPost.model';
import type { CareerPage } from '../models/profile.model';

/** What every source adapter returns before normalization. */
export interface RawJob {
  source: string;
  sourceId?: string;
  url: string;
  company: string;
  title: string;
  location?: string;
  remote?: boolean | null;
  description?: string;
  salary?: Salary | null;
  postedAt?: Date;
  applyEmail?: string;
  applyUrl?: string;
  tags?: string[];
}

export interface JobSource {
  name: string;
  fetch(): Promise<RawJob[]>;
}

export interface SourceContext {
  roles: string[];
  careerPages: CareerPage[];
}
