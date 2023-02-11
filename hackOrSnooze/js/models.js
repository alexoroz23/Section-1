"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {storyId, title, author, url, username, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    const urlObject = new URL(this.url);
    return urlObject.host;
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, { title, author, url }) {
    // Extract the user's login token
    const token = user.loginToken;
  
    // Make a POST request to the stories endpoint with the user's token and story details
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: { token, story: { title, author, url } },
    });
  
    // Create a new Story object from the response data
    const story = new Story(response.data.story);
  
    // Add the new story to the list of stories and the user's own stories
    this.stories.unshift(story);
    user.ownStories.unshift(story);
  
    // Return the new story
    return story;
  }

// delete story from API and take it out from the story lists

async removeStory(user, storyId) {
  // Get the login token of the user
  const token = user.loginToken;

  // Send a DELETE request to the server to delete the story
  await axios({
    url: `${BASE_URL}/stories/${storyId}`,
    method: "DELETE",
    data: { token }
  });

  // Filter out the story from the list of all stories
  this.stories = this.stories.filter(story => story.storyId !== storyId);

  // Filter out the story from the user's list of own stories and favorites
  user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
  user.favorites = user.favorites.filter(s => s.storyId !== storyId);
}
}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  /** Add a story to the list of user favorites and update the API
   * - story: a Story instance to add to favorites
   */

  async addFavorite(story) {
    // Add the story to the user's list of favorites
    this.favorites.push(story);
    // Call the helper function `_addOrRemoveFavorite` to update the API
    await this._addOrRemoveFavorite("add", story);
  }

  /**
   * Remove a story from the list of user favorites and update the API
   * - story: the Story instance to remove from favorites
   */

  async removeFavorite(story) {
    // Filter out the story from the user's list of favorites
    this.favorites = this.favorites.filter(s => s.storyId !== story.storyId);
    // Call the helper function `_addOrRemoveFavorite` to update the API
    await this._addOrRemoveFavorite("remove", story);
  }

  /**
   * Update the API with the user's favorite or not-favorite status for the given story
   * - newState: "add" or "remove"
   * - story: Story instance to make favorite / not favorite
   */

  async _addOrRemoveFavorite(newState, story) {
    // Determine the HTTP method (POST or DELETE) based on the newState parameter
    const method = newState === "add" ? "POST" : "DELETE";
    // Get the user's login token
    const token = this.loginToken;
    // Make the API call using axios
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method,
      data: { token },
    });
  }

  /**
   * Return true or false depending on if the given story is a favorite of this user
   * - story: the Story instance to check against the user's favorites list
   * Returns: a boolean indicating if the story is a favorite of this user
   */
  
  isFavorite(story) {
    // Check if the story exists in the user's list of favorites
    return this.favorites.some(s => (s.storyId === story.storyId));
  }
}