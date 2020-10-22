# Peloton Reschedule Notifier

Was your Peloton delivery rescheduled? Were you given a new potential delivery date far, far in the future? Use this Node.js app to notify you in Slack when a new delivery date is posted!

## Installation

Assuming you have Node.js installed, simply run `npm i` to install dependencies

## Pre-reqs

You must have the following if you intend to use this app:

- A reschedule URL sent from Peloton (likely via email and via text)
- A Slack Incoming Webhook URL (set one up [here](https://americanairlines.slack.com/apps/A0F7XDUAZ-incoming-webhooks))

## Running the App

Duplicate `.env.sample` as `.env` and add the following values:

- `CURRENT_DELIVERY_DATE`: Add a delivery date for your current delivery (`YYYY-MM-DD`, eg., `2021-12-29`)
- `DELIVERY_ID`: You can find this value within in the URL described above: `https://www.onepeloton.com/delivery/YOUR_DELIVERY_ID/reschedule`
- `SLACK_WEBHOOK_URL`: Use the webhook URL obtained from the section above
- `COOKIE`: Until the app is updated to retrieve a new cookie, you'll need to obtain yours from within a browser

After saving your new `.env` file, run the app with `npm start`.

## FAQ

#### Why did you make this?

Because Peloton's customer service is horrendous and they offer virtually no transparency into their delivery process.

#### Are you super impatient?

Yes. COVID has taken a toll on my waistline and I'd like to correct that sooner than later.

## Test Coverage

This project has about as much test coverage as Peloton has empathy for their customers.
