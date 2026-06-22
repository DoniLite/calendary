package com.calendary.projects.api.dto

import com.calendary.projects.domain.Project

data class ProjectListResponse(
	val projects: List<ProjectResponse>,
)

fun List<Project>.toResponse(): ProjectListResponse =
	ProjectListResponse(map { it.toResponse() })
