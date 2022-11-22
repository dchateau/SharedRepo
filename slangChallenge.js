const axios = require("axios");
/**
 * Castillo Rodríguez David Israel
 * Challenge: Engineering intern
 * Written using JavaScript
 * November 2022
 * 
 * Utilise => npm install && node slangChallenge.js
 * NodeJS v16.16.0
 */
// API key
const API_KEY =
  "MTM0OkNGYjY4NW5tNHdiOVJrTk1aZm1raG0va0swN3lEcHpMT0lhanc5dzNiazA9";

// Constant defined to compare the time elapsed between activities
const fiveMinutes = 300000;

/**
 * Once the JSON has been received and parsed in the main flow code,
 * we firstly look for not existing users, if so, we create a new
 * key (entry) where the activities related to a user will be stored.
 * The users are extracted from the received activities array.
 * @param {*} activities
 * @returns
 */
const getUserActivities = (activities) => {
  const usersActivities = {};

  activities.activities.forEach((activity) => {
    const userFound = usersActivities[activity.user_id];

    if (!userFound) {
      usersActivities[activity.user_id] = [];
    }

    const newActivity = {
      activity_id: activity.id,
      started_at: activity.first_seen_at,
      ended_at: activity.answered_at,
    };
    usersActivities[activity.user_id].push(newActivity);
  });

  return usersActivities;
};

/**
 * In the main flow code, the activities extracted for a user are sorted
 * using the JavaScript built-in 'sort' method for arrays. Thus, assuming
 * all activities are already sorted ascendantly, we compare the n and n+1
 * element of the array to verify if they belong to same session, only if
 * the elapsed is less than five minutes (300,000 ms).
 *
 * We use a mid-array to look for chained activities, if two or more
 * activities belong to the same session there will be a sequence of 1's
 * ended with a -1, indicating the end of that group of activities. If
 * there is a single activity, the position in the array will hold a 0
 * @param {*} activities
 * @returns
 */
const getRelatedActivities = (activities) => {
  const relatedActivities = new Array(activities.length).fill(0);
  for (let i = 0; i < activities.length; i++) {
    let fstActivity, sndActivity;

    if (i !== activities.length - 1) {
      fstActivity = new Date(activities[i].ended_at).getTime();
      sndActivity = new Date(activities[i + 1].started_at).getTime();
      const timeElapsed = sndActivity - fstActivity;

      if (timeElapsed <= fiveMinutes) {
        if (relatedActivities[i] === 0) relatedActivities[i] = 1;
        if (relatedActivities[i + 1] === 0) relatedActivities[i + 1] = 1;
      } else {
        if (relatedActivities[i + 1] === 0) relatedActivities[i] = -1;
      }
    } else {
      if (relatedActivities[i] === 1) relatedActivities[i] = -1;
    }
  }

  return relatedActivities;
};

/**
 * Once we have gotten the related activities using the 'getRelatedActivities'
 * function, we iterate the array returned by this one. The possible cases are
 * shown below:
 * 1.   Single activity: It is stored using all of its information unmodified,
 *      just the ID, which is stored within an array.
 * 2.   Two or more activities: Is there is a sequence of activities (which might
 *      look as [1,1,...,-1]) we store the "started_at" value of the first activity,
 *      in each iteration we store the ID of the activity. Until we reach the last
 *      related activity (-1), where we store the "ended_at" value. Finally, we
 *      construct the group of activities using the information stored.
 * We return the array of activity groups.
 * @param {*} relatedActivities
 * @param {*} activities
 * @returns
 */
const groupRelatedActivities = (relatedActivities, activities) => {
  let activity = {};
  let activityIds = [],
    groupedActivities = [];
  let isStartDate = true;
  let endDate, startDate, elapsedTime;

  for (let i = 0; i < relatedActivities.length; i++) {
    // Unrelated activity
    if (relatedActivities[i] === 0) {
      endDate = new Date(activities[i].ended_at);
      startDate = new Date(activities[i].started_at);
      elapsedTime = endDate.getTime() - startDate.getTime();
      activityIds.push(activities[i].activity_id);

      activity = {
        ended_at: activities[i].ended_at,
        started_at: activities[i].started_at,
        activity_ids: activityIds,
        duration_seconds: (elapsedTime / 1000).toFixed(1),
      };
      groupedActivities.push(activity);
      activityIds = [];
    }
    // Activities to be grouped together
    if (relatedActivities[i] === 1) {
      if (isStartDate) {
        startDate = activities[i].started_at;
        isStartDate = false;
      }

      activityIds.push(activities[i].activity_id);
    }
    // Last activity to be grouped
    if (relatedActivities[i] === -1) {
      endDate = activities[i].ended_at;
      activityIds.push(activities[i].activity_id);
      elapsedTime = new Date(endDate).getTime() - new Date(startDate).getTime();

      activity = {
        ended_at: endDate,
        started_at: startDate,
        activity_ids: activityIds,
        duration_seconds: (elapsedTime / 1000).toFixed(1),
      };
      groupedActivities.push(activity);
      activityIds = [];
      isStartDate = true;
    }
  }

  return groupedActivities;
};

/**
 * Main-flow code
 */
axios
  .get("https://api.slangapp.com/challenges/v1/activities", {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${API_KEY}`,
    },
  })
  .then((response) => {
    if (!response.status) {
      throw new Error(response);
    }

    const activities = response.data;
    return activities;
  })
  .then((activities) => {
    const usersActivities = getUserActivities(activities);
    const users = Object.keys(usersActivities);
    let count = 1;
    /**
     * Sorting the activities per date for each user
     * Sort method, exposed by JS, for arrays has a complexity
     * of O(n log n). Since it uses merge sort.
     */
    users.forEach((user) => {
      const activities = usersActivities[user];

      activities.sort((fstActivity, sndActivity) => {
        return fstActivity.started_at.localeCompare(sndActivity.started_at);
      });

      const relatedActivities = getRelatedActivities(activities);
      const groupedActivities = groupRelatedActivities(
        relatedActivities,
        activities
      );

      usersActivities[user] = [];
      usersActivities[user] = groupedActivities;
      count++;

      // Finished iterating all users
      if (count === users.length + 1) {
        console.log(usersActivities);
        axios
          .post(
            "https://api.slangapp.com/challenges/v1/activities/sessions",
            { user_sessions: usersActivities },
            {
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${API_KEY}`,
              },
            }
          )
          .then((response) => {
            console.log(
              "POST request was successfully sent with status code ",
              response.status
            );
          })
          .catch((err) => console.log("Something went wrong. ", err.message));
      }
    });
  })
  .catch((err) => console.log(err.message, err.status));

/**
 * Complexity of the developed algorithm
 * In line 174 where we relate the activities to a user the complexity reaches
 * O(n) linear complexity. Since we have to go through all of the elements of the
 * activities array. Sorting the array of activities for a user reaches the O(n log n)
 * logarithmic order. Since we're using Chrome's V8 engine for runtime execution,
 * the worst-case scenario is logarithmic https://v8.dev/blog/array-sort.
 * Finally for getting and grouping activities, the complexity reaches linear order as
 * well.
 */
