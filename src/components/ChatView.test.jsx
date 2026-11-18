import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import ChatView from './ChatView.jsx'

const chat = {
  id: 'thread-5',
  title: 'Trek bike',
  partnerName: 'Ana',
  messages: [],
  unread: 0,
}

function renderChat(props = {}) {
  return render(
    <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
      <ChatView chat={chat} onSend={vi.fn()} liveStatus="live" {...props} />
    </LanguageProvider>,
  )
}

describe('ChatView', () => {
  it('names the other user and the item in the header', () => {
    renderChat()

    expect(
      screen.getByText('Chatting with Ana regarding Trek bike'),
    ).toBeInTheDocument()
  })

  it('falls back to a generic name when the partner is unknown', () => {
    renderChat({ chat: { ...chat, partnerName: null } })

    expect(
      screen.getByText('Chatting with the other user regarding Trek bike'),
    ).toBeInTheDocument()
  })
})
