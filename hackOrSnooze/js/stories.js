"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 * - showDeleteBtn: show delete button?
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story, showDeleteBtn = false) {
   // Generate the markup for a story based on the story instance and show delete button flag
  const hostName = story.getHostName();

  // Check if a user is logged in and show favorite/not-favorite star
  const showStar = Boolean(currentUser);

  return $(`
      <li id="${story.storyId}">
        ${showDeleteBtn ? getDeleteBtnHTML() : ""} 
        ${showStar ? getStarHTML(story, currentUser) : ""}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
   // Show delete button if showDeleteBtn is true 
   // Show favorite/not-favorite star if a user is logged in 
}

/** Make delete button HTML for story */

function getDeleteBtnHTML() {
      // Return a span element with a trash can icon
  return `
      <span class="trash-can">
        <i class="fas fa-trash-alt"></i>
      </span>`;
}

/** Make favorite/not-favorite star for story */

function getStarHTML(story, user) {
    // Check if the story is a favorite of the user
    const isFavorite = user.isFavorite(story);
  
    // Select the type of star to display: filled or outline
    const starType = isFavorite ? "fas" : "far";
  
    // Return the HTML for the star
    return `
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>`;
  }

/** Gets list of stories from server, generates their HTML, and puts on page. */

// function to place stories on the page
function putStoriesOnPage() {
    console.debug("putStoriesOnPage");
  
    // Empty the existing stories in the list
    $allStoriesList.empty();
  
    // Loop through all the stories and generate the HTML for each story
    for (let story of storyList.stories) {
      // Generate the story markup for the current story
      const $story = generateStoryMarkup(story);
      // Append the generated story markup to the list of stories
      $allStoriesList.append($story);
    }
  
    // Show the list of stories
    $allStoriesList.show();
  }

/** Handle deleting a story. */

async function deleteStory(evt) {
    // log a debug message indicating the function has been called
    console.debug("deleteStory");
  
    // find the closest list item to the trash can icon that was clicked
    const $closestLi = $(evt.target).closest("li");
  
    // retrieve the id of the story from the list item
    const storyId = $closestLi.attr("id");
  
    // remove the story from the list of stories by calling storyList.removeStory()
    await storyList.removeStory(currentUser, storyId);
  
    // re-generate the story list
    await putUserStoriesOnPage();
  }
  
  // bind the deleteStory function to the click event of the trash can icon in the 'ownStories' section
  $ownStories.on("click", ".trash-can", deleteStory);

// Adds Story to the list: **

// function is called when the submit form is submitted
async function addStoriesOnPage(evt) {
    // Logging a message to the console for debugging purposes
  console.debug("addStoriesOnPage");
    // Preventing the default form submission behavior
  evt.preventDefault();

  // retrieve the values from the form inputs
  const title = $("#create-title").val();
  const url = $("#create-url").val();
  const author = $("#create-author").val();

  // retrieving the current user's username
  const username = currentUser.username
  // creating an object with the form data and the username
  const storyData = {title, url, author, username };
  // adding a new story to the story list using the form data and the current user
  const newStory = await storyList.addStory(currentUser, storyData);
  // generates HTML markup for the new story
  const $story = generateStoryMarkup(newStory);

  // adding the generated story to the beginning of the all stories list
  $allStoriesList.prepend($story);

  // hide the form and reset it
  $submitForm.slideUp("slow");
  $submitForm.trigger("reset");
}
// attaching the addStoriesOnPage function as the submit event listener for the submit form
$submitForm.on("submit", addStoriesOnPage);

/******************************************************************************
 * Functionality for list of user's own stories
 */

function putUserStoriesOnPage() {
  console.debug("putUserStoriesOnPage");

  $ownStories.empty();

  if (currentUser.ownStories.length === 0) {
    $ownStories.append("<h5>No stories added by user yet!</h5>");
  } else {
    // loop through all of users stories and generate HTML for them
    for (let story of currentUser.ownStories) {
      let $story = generateStoryMarkup(story, true);
      $ownStories.append($story);
    }
  }

  $ownStories.show();
}

/******************************************************************************
 * Functionality for favorites list and starr/un-starr a story
 */

/** Put favorites list on page. */

function putFavoritesListOnPage() {
  console.debug("putFavoritesListOnPage");

  $favoritedStories.empty();

  if (currentUser.favorites.length === 0) {
    $favoritedStories.append("<h5>No favorites added!</h5>");
  } else {
    // loop through all of users favorites and generate HTML for them
    for (let story of currentUser.favorites) {
      const $story = generateStoryMarkup(story);
      $favoritedStories.append($story);
    }
  }

  $favoritedStories.show();
}

/** Handle favorite/un-favorite a story */

async function toggleStoryFavorite(evt) {
    console.debug("toggleStoryFavorite");
  
    // get the clicked star icon element
    const $tgt = $(evt.target);
    // get the parent li element of the star icon
    const $closestLi = $tgt.closest("li");
    // get the storyId from the li element's id attribute
    const storyId = $closestLi.attr("id");
    // find the story in the storyList based on the storyId
    const story = storyList.stories.find(s => s.storyId === storyId);
  
    // check if the star icon has the "fas" class, which means it is currently a favorite
    if ($tgt.hasClass("fas")) {
      // currently a favorite: remove it from the user's favorite list and change the star icon
      await currentUser.removeFavorite(story);
      $tgt.closest("i").toggleClass("fas far");
    } else {
      // currently not a favorite: add it to the user's favorite list and change the star icon
      await currentUser.addFavorite(story);
      $tgt.closest("i").toggleClass("fas far");
    }
  }
  
  // listen to the click event on elements with class "star" within the $storiesLists container
  $storiesLists.on("click", ".star", toggleStoryFavorite);