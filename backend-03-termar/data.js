const fs = require('fs');
const path = require('path');

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8'),
);

const clone = (value) => JSON.parse(JSON.stringify(value));

// The mutable store. Reset on restart.
const store = {
  meta: clone(seed.meta),
  jobs: clone(seed.jobs),
  checklistTemplates: clone(seed.checklistTemplates),
  vanStock: clone(seed.vanStock),
  syncQueue: clone(seed.syncQueue),
  worksheets: { [seed.sampleWorksheet.jobId]: clone(seed.sampleWorksheet) },
};

function getDay() {
  return clone(store.meta);
}

function getJobs() {
  return clone(store.jobs);
}

function getJob(id) {
  const job = store.jobs.find((j) => j.id === id);
  return job ? clone(job) : null;
}

function getChecklistTemplates() {
  return clone(store.checklistTemplates);
}

function getChecklistTemplate(plantType) {
  const template = store.checklistTemplates[plantType];
  return template ? clone(template) : null;
}

function getVanStock() {
  return clone(store.vanStock);
}

function getSyncQueue() {
  return clone(store.syncQueue);
}

function getWorksheet(jobId) {
  const worksheet = store.worksheets[jobId];
  return worksheet ? clone(worksheet) : null;
}

function saveWorksheet(jobId, worksheet) {
  if (!getJob(jobId)) return null;
  store.worksheets[jobId] = { ...clone(worksheet), jobId };
  return clone(store.worksheets[jobId]);
}

function setJobStatus(jobId, status) {
  const job = store.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  job.status = status;
  if (status === 'synced') {
    job.syncedAt = new Date().toISOString().slice(0, 19);
    job.localOnly = false;
  }
  return clone(job);
}

module.exports = {
  getDay,
  getJobs,
  getJob,
  getChecklistTemplates,
  getChecklistTemplate,
  getVanStock,
  getSyncQueue,
  getWorksheet,
  saveWorksheet,
  setJobStatus,
};
