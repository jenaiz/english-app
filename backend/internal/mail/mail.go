// Package mail sends transactional emails (account verification, password reset).
package mail

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// SESSender sends through Amazon SES, the same account bukios uses.
type SESSender struct {
	From   string
	client *sesv2.Client
}

func NewSESSender(ctx context.Context, from, region, accessKey, secretKey string) (*SESSender, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}
	return &SESSender{From: from, client: sesv2.NewFromConfig(cfg)}, nil
}

func (s *SESSender) Send(ctx context.Context, msg Message) error {
	utf8 := aws.String("UTF-8")
	_, err := s.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.From),
		Destination:      &types.Destination{ToAddresses: []string{msg.To}},
		Content: &types.EmailContent{Simple: &types.Message{
			Subject: &types.Content{Data: aws.String(msg.Subject), Charset: utf8},
			Body: &types.Body{
				Text: &types.Content{Data: aws.String(msg.Text), Charset: utf8},
				Html: &types.Content{Data: aws.String(msg.HTML), Charset: utf8},
			},
		}},
	})
	if err != nil {
		return fmt.Errorf("ses send to %s: %w", msg.To, err)
	}
	return nil
}

// LogSender writes emails to the log instead of sending them (local development).
type LogSender struct{}

func (LogSender) Send(_ context.Context, msg Message) error {
	log.Printf("email (not sent, SES not configured) to=%s subject=%q\n%s", msg.To, msg.Subject, msg.Text)
	return nil
}
