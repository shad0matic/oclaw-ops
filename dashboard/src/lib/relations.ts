import { relations } from "drizzle-orm/relations";
import { runsInOps, agentEventsInOps, taskQueueInOps, workflowsInOps, stepsInOps, tasksInOps, prioritiesInOps, crossSignalsInOps, entitiesInMemory, entityRelationsInMemory, taskAssignmentsInOps, agentSignalsInOps, taskRunsInOps, costEstimatesInOps } from "./schema";

export const agentEventsInOpsRelations = relations(agentEventsInOps, ({one}) => ({
	runsInOp: one(runsInOps, {
		fields: [agentEventsInOps.contextId],
		references: [runsInOps.id]
	}),
	taskQueueInOp: one(taskQueueInOps, {
		fields: [agentEventsInOps.taskId],
		references: [taskQueueInOps.id]
	}),
}));

export const runsInOpsRelations = relations(runsInOps, ({one, many}) => ({
	agentEventsInOps: many(agentEventsInOps),
	workflowsInOp: one(workflowsInOps, {
		fields: [runsInOps.workflowId],
		references: [workflowsInOps.id]
	}),
	stepsInOps: many(stepsInOps),
	tasksInOps: many(tasksInOps),
	taskAssignmentsInOps: many(taskAssignmentsInOps),
	agentSignalsInOps: many(agentSignalsInOps),
}));

export const taskQueueInOpsRelations = relations(taskQueueInOps, ({many}) => ({
	agentEventsInOps: many(agentEventsInOps),
}));

export const workflowsInOpsRelations = relations(workflowsInOps, ({many}) => ({
	runsInOps: many(runsInOps),
}));

export const stepsInOpsRelations = relations(stepsInOps, ({one, many}) => ({
	runsInOp: one(runsInOps, {
		fields: [stepsInOps.runId],
		references: [runsInOps.id]
	}),
	tasksInOps: many(tasksInOps),
}));

export const tasksInOpsRelations = relations(tasksInOps, ({one}) => ({
	runsInOp: one(runsInOps, {
		fields: [tasksInOps.runId],
		references: [runsInOps.id]
	}),
	stepsInOp: one(stepsInOps, {
		fields: [tasksInOps.stepId],
		references: [stepsInOps.id]
	}),
}));

export const crossSignalsInOpsRelations = relations(crossSignalsInOps, ({one}) => ({
	prioritiesInOp: one(prioritiesInOps, {
		fields: [crossSignalsInOps.priorityId],
		references: [prioritiesInOps.id]
	}),
}));

export const prioritiesInOpsRelations = relations(prioritiesInOps, ({many}) => ({
	crossSignalsInOps: many(crossSignalsInOps),
}));

export const entityRelationsInMemoryRelations = relations(entityRelationsInMemory, ({one}) => ({
	entitiesInMemory_sourceId: one(entitiesInMemory, {
		fields: [entityRelationsInMemory.sourceId],
		references: [entitiesInMemory.id],
		relationName: "entityRelationsInMemory_sourceId_entitiesInMemory_id"
	}),
	entitiesInMemory_targetId: one(entitiesInMemory, {
		fields: [entityRelationsInMemory.targetId],
		references: [entitiesInMemory.id],
		relationName: "entityRelationsInMemory_targetId_entitiesInMemory_id"
	}),
}));

export const entitiesInMemoryRelations = relations(entitiesInMemory, ({many}) => ({
	entityRelationsInMemories_sourceId: many(entityRelationsInMemory, {
		relationName: "entityRelationsInMemory_sourceId_entitiesInMemory_id"
	}),
	entityRelationsInMemories_targetId: many(entityRelationsInMemory, {
		relationName: "entityRelationsInMemory_targetId_entitiesInMemory_id"
	}),
}));

export const taskAssignmentsInOpsRelations = relations(taskAssignmentsInOps, ({one, many}) => ({
	taskAssignmentsInOp: one(taskAssignmentsInOps, {
		fields: [taskAssignmentsInOps.parentTaskId],
		references: [taskAssignmentsInOps.id],
		relationName: "taskAssignmentsInOps_parentTaskId_taskAssignmentsInOps_id"
	}),
	taskAssignmentsInOps: many(taskAssignmentsInOps, {
		relationName: "taskAssignmentsInOps_parentTaskId_taskAssignmentsInOps_id"
	}),
	runsInOp: one(runsInOps, {
		fields: [taskAssignmentsInOps.runId],
		references: [runsInOps.id]
	}),
}));

export const agentSignalsInOpsRelations = relations(agentSignalsInOps, ({one}) => ({
	runsInOp: one(runsInOps, {
		fields: [agentSignalsInOps.taskId],
		references: [runsInOps.id]
	}),
}));

export const costEstimatesInOpsRelations = relations(costEstimatesInOps, ({one}) => ({
	taskRunsInOp: one(taskRunsInOps, {
		fields: [costEstimatesInOps.taskRunId],
		references: [taskRunsInOps.id]
	}),
}));

export const taskRunsInOpsRelations = relations(taskRunsInOps, ({many}) => ({
	costEstimatesInOps: many(costEstimatesInOps),
}));