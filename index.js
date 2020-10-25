require("dotenv").config();
const fetch = require("node-fetch");
const CronJob = require("cron").CronJob;

const currentDeliveryDate = new Date(process.env.CURRENT_DELIVERY_DATE);
const deliveryId = process.env.DELIVERY_ID;

const pelotonApiUrl = "https://graph.prod.k8s.onepeloton.com/graphql";
const query = {
  operationName: "OrderDelivery",
  variables: { isReschedule: true, id: deliveryId },
  query:
    "query OrderDelivery($id: ID!, $isReschedule: Boolean = false) {\n  order(id: $id) {\n    isFsl\n    canSetDeliveryPreference\n    canReschedule\n    deliveryPreference {\n      date\n      start\n      end\n      __typename\n    }\n    availableDeliveries(limit: 5, isReschedule: $isReschedule) {\n      id\n      date\n      start\n      end\n      __typename\n    }\n    __typename\n  }\n  postPurchaseFlow(id: $id) {\n    permission\n    __typename\n  }\n}\n",
};
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const rescheduleUrl = `https://www.onepeloton.com/delivery/${deliveryId}/reschedule`;

// TODO: Remove this after implementing cookie refresh
const cookie = process.env.COOKIE;

// Query immediately and on the 55th minute of every other hour
new CronJob(
  "55 */2 * * *",
  async function () {
    try {
      await refreshCookie();

      await sendUpdateToSlack("Still querying, no new delivery times.");
    } catch (err) {
      console.log("Unable to refresh Peloton API cookie: ", err);
    }
  },
  null,
  true,
  null,
  null,
  true
);

// Query immediately and then every 10th minute
new CronJob(
  "*/10 * * * *",
  async function () {
    try {
      await evaluateEarliestDeliveryDate();
    } catch (err) {
      console.log("Unable to complete query to Peloton API: ", err);
    }
  },
  null,
  true,
  null,
  null,
  true
);

async function refreshCookie() {
  // TODO: Implement cookie (if necessary)
}

async function evaluateEarliestDeliveryDate(retry = true) {
  console.log("Making request to Peloton's API...");
  const response = await fetch(pelotonApiUrl, {
    method: "POST",
    body: JSON.stringify(query),
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    // Send error message
    console.error("Something went wrong...", response.statusText, response);
    sendUpdateToSlack("Unable to query Peloton API; see logs for more details");
    return;
  }

  const data = await response.json();
  const earliestDelivery = data.data.order.availableDeliveries[0];
  if (!earliestDelivery && retry) {
    return evaluateEarliestDeliveryDate(false);
  } else if (!earliestDelivery) {
    await sendUpdateToSlack(
      "Peloton did not return delivery times after 2 attempts... we'll try again in 10 minutes."
    );
    return;
  }
  const earliestDeliveryDate = new Date(earliestDelivery.date);

  if (earliestDeliveryDate < currentDeliveryDate) {
    sendUpdateToSlack(
      `A new delivery date was posted!!! Hurry and <${rescheduleUrl}|reschedule>!`
    );
    console.log("A new delivery date was posted!!!");
  } else {
    console.log(
      `No luck... earliest delivery is on ${earliestDelivery.date}. Checking again in 10 minutes 😓`
    );
  }
}

async function sendUpdateToSlack(updateMessage) {
  try {
    const res = await fetch(slackWebhookUrl, {
      method: "POST",
      body: JSON.stringify({ text: updateMessage }),
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }
  } catch (err) {
    console.error("Unable to post message to Slack: ", err);
  }
}
