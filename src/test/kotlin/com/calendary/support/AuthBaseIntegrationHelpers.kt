package com.calendary.support

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.users.domain.UserAccount
import com.calendary.workspaces.domain.Workspace
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post

@AutoConfigureMockMvc
abstract class AuthBaseIntegrationHelpers(
    private val mockMvc: MockMvc,
    private val onboarding: OnboardingService,
    private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
    val user: UserAccount by lazy {
        onboarding.bootstrapSuperAdmin(
            BootstrapSuperAdminCommand(
                email = "owner@calendary.dev",
                password = "very-secret-password",
                workspaceName = "Owner workspace",
            )
        )
    }

     fun loginAs(email: String, password: String): MockHttpSession {
        val result = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """
				{
				  "email": "$email",
				  "password": "$password"
				}
			""".trimIndent()
        }
            .andExpect {
                status { isOk() }
            }
            .andReturn()

        return result.request.session as MockHttpSession
    }

     fun bootstrapWorkspace(): Workspace {
        return workspaces.findFirstByOwnerIdAndType(user.id, WorkspaceType.PERSONAL).orElseThrow()
    }
}