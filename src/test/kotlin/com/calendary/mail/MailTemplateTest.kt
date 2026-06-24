package com.calendary.mail

import com.calendary.mail.application.MailTemplate
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MailTemplateTest {
	@Test
	fun `renders subject, paragraphs and brand styling`() {
		val html = MailTemplate.render(
			subject = "You have been invited to Calendary",
			body = "You have been invited to Calendary.\n\nAccept your invitation:\nhttps://donilite.me/accept-invitation?token=abc",
			actionLabel = null,
			actionUrl = null,
			publicBaseUrl = "https://donilite.me",
		)

		assertTrue(html.contains("Calendary"))
		assertTrue(html.contains("You have been invited to Calendary."))
		assertTrue(html.contains("#f0671c"))
		assertTrue(html.contains("https://donilite.me"))
	}

	@Test
	fun `renders an action button when label and url are provided`() {
		val html = MailTemplate.render(
			subject = "Your booking was accepted",
			body = "Hi Ada,\n\nYour meeting request was accepted.",
			actionLabel = "Join Google Meet",
			actionUrl = "https://meet.google.com/abc-defg-hij",
			publicBaseUrl = "https://donilite.me",
		)

		assertTrue(html.contains("Join Google Meet"))
		assertTrue(html.contains("https://meet.google.com/abc-defg-hij"))
	}

	@Test
	fun `omits the action button when no url is provided`() {
		val html = MailTemplate.render(
			subject = "Your booking was rejected",
			body = "Your meeting request was rejected.",
			actionLabel = null,
			actionUrl = null,
			publicBaseUrl = "https://donilite.me",
		)

		assertFalse(html.contains("display:inline-block"))
	}

	@Test
	fun `escapes html in dynamic content to prevent injection`() {
		val html = MailTemplate.render(
			subject = "New Calendary booking request",
			body = "<script>alert('xss')</script> requested a meeting.",
			actionLabel = null,
			actionUrl = null,
			publicBaseUrl = "https://donilite.me",
		)

		assertFalse(html.contains("<script>"))
		assertTrue(html.contains("&lt;script&gt;"))
	}
}
