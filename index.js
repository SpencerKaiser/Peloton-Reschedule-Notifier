require("dotenv").config();
const fetch = require("node-fetch");

const minutesBetweenQueries = 5;
const soonestDelivery = new Date(process.CURRENT_DELIVERY_DATE);
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

// TODO: Remove this
const cookie = process.env.COOKIE;

evaluateEarliestDeliveryDate();
setInterval(evaluateEarliestDeliveryDate, minutesBetweenQueries * 60 * 1000);

async function evaluateEarliestDeliveryDate() {
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
  const earliestDeliveryDate = new Date(earliestDelivery.date);

  if (earliestDeliveryDate < soonestDelivery) {
    sendUpdateToSlack(
      `A new delivery date was posted!!! Hurry and <${rescheduleUrl}|reschedule>!`
    );
    console.log("A new delivery date was posted!!!");
  } else {
    console.log("No luck... checking again in 5 minutes 😓");
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
