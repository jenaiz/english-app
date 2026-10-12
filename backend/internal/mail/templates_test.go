package mail

import (
	"strings"
	"testing"
)

func TestTemplatesIncludeLink(t *testing.T) {
	link := "https://example.com/verificar-email?token=abc&x=1"
	for _, msg := range []Message{VerifyEmail("a@b.c", "https://example.com", link), ResetPassword("a@b.c", "https://example.com", link)} {
		if msg.To != "a@b.c" || msg.Subject == "" {
			t.Fatalf("bad message header: %+v", msg)
		}
		if !strings.Contains(msg.Text, link) {
			t.Errorf("text body missing link: %q", msg.Text)
		}
		if !strings.Contains(msg.HTML, "token=abc&amp;x=1") {
			t.Errorf("html body missing escaped link")
		}
		if !strings.Contains(msg.HTML, `src="https://example.com/icon-192.png"`) {
			t.Errorf("html body missing logo")
		}
	}
}
