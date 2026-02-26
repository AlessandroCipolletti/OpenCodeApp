import type { SchedulerSdk, JobDefinition } from "./types";

const registeredJobs: Map<string, JobDefinition> = new Map();

export function createSchedulerSdk(): SchedulerSdk {
  return {
    registerJob(job: JobDefinition): void {
      if (registeredJobs.has(job.name)) {
        throw new Error(`Job "${job.name}" is already registered.`);
      }
      registeredJobs.set(job.name, job);
      console.log(`[Scheduler] Registered job: ${job.name} (${job.cron})`);
    },
  };
}

export function getRegisteredJobs(): JobDefinition[] {
  return Array.from(registeredJobs.values());
}
