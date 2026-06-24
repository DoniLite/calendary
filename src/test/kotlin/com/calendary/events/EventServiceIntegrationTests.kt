package com.calendary.events

import com.calendary.events.application.CreateEventCommand
import com.calendary.events.application.EventService
import com.calendary.events.application.UpdateEventCommand
import com.calendary.events.domain.EventStatus
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.AuthBaseIntegrationHelpers
import com.calendary.workspaces.infra.WorkspaceRepository
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.transaction.annotation.Transactional

class EventServiceIntegrationTests(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val onboarding: OnboardingService,
    @Autowired private val workspaces: WorkspaceRepository,
    @Autowired private val events: EventService
) : AuthBaseIntegrationHelpers(mockMvc, onboarding, workspaces) {

    @Test
    @Transactional
    fun `creates, updates and fetches an event`() {
        val workspace = bootstrapWorkspace()
        val userId = user.id
        val now = Instant.now()
        val fiveMinuteFromNow: Instant = now.plus(Duration.ofMinutes(5))
        val twoHoursLater = now.plus(Duration.ofHours(2))

        val event = events.create(
            CreateEventCommand(
                workspace.id,
                userId,
                "My Event",
                fiveMinuteFromNow,
                twoHoursLater
            )
        )

        assertNotNull(event, "Event should not be null")
        assertEquals(event.workspace!!.id, workspace.id, "Event workspace id should match workspace id")
        assertEquals(event.createdBy!!.id, userId, "Event should be created by user")
        assertEquals(event.startsAt, fiveMinuteFromNow, "start date mismatch with the return value")
        assertEquals(event.endsAt, twoHoursLater, "end date mismatch with the return value")
        assertEquals(event.status, EventStatus.CONFIRMED, "default event status should be confirmed")

        val newEventTitle = "newEventTitle"
        val updatedEvent = events.update(
            UpdateEventCommand(
                workspace.id,
                userId,
                event.id,
                newEventTitle,
                event.startsAt,
                event.endsAt
            )
        )
        assertEquals(updatedEvent.id, event.id, "Event id should never be updated")
        assertEquals(updatedEvent.title, newEventTitle, "Event title not updated")
        assertEquals(updatedEvent.startsAt, event.startsAt, "this field should not be updated")
        assertEquals(updatedEvent.endsAt, event.endsAt, "this field should not be updated")

        val fetched = events.get(workspace.id, event.id, userId)
        assertEquals(event.id, fetched.id, "Event id not match")
    }
}
