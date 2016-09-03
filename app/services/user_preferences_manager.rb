class UserPreferencesManager
  DEFAULT_PREFERENCES = {
    text: "my preferences",
    items: [{
      text: "keyboard shortcuts",
      items: [{
        text: "ctrl + enter",
        items: [{
          text: "enter command mode",
          items: []
        }]
      },{
        text: "alt + =",
        items: [{
          text: "add text \"\\[=]\"",
          items: []
        }]
      },{
        text: "alt + shift + ;",
        items: [{
          text: "add text \"\\[:]\"",
          items: []
        }]
      },{
        text: "alt + 0",
        items: [{
          text: "goto -1",
          items: []
        }]
      },{
        text: "alt + spacebar",
        items: [{
          text: "goto ($parent)",
          items: []
        }]
      },{
        text: "ctrl + spacebar",
        items: [{
          text: "toggle collapse",
          items: []
        }]
      },{
        text: "ctrl + right",
        items: [{
          text: "zoom in",
          items: []
        }]
      },{
        text: "ctrl + left",
        items: [{
          text: "zoom out",
          items: []
        }]
      },{
        text: "ctrl + up",
        items: [{
          text: "collapse all",
          items: []
        }]
      },{
        text: "ctrl + down",
        items: [{
          text: "expand all",
          items: []
        }]
      },{
        text: "ctrl + alt + up",
        items: [{
          text: "collapse items recursively",
          items: []
        }]
      },{
        text: "ctrl + shift + d",
        items: [{
          text: "duplicate",
          items: []
        }]
      },{
        text: "ctrl + shift + delete",
        items: [{
          text: "delete",
          items: []
        }]
      },{
        text: "ctrl + shift + down",
        items: [{
          text: "move down",
          items: []
        }]
      },{
        text: "ctrl + shift + up",
        items: [{
          text: "move up",
          items: []
        }]
      },{
        text: "ctrl + shift + right",
        items: [{
          text: "indent",
          items: []
        }]
      },{
        text: "ctrl + shift + left",
        items: [{
          text: "outdent",
          items: []
        }]
      },{
        text: "ctrl + shift + spacebar",
        items: [{
          text: "toggle collapse siblings",
          items: []
        }]
      },{
        text: "alt + enter",
        items: [{
          text: "new item",
          items: []
        }]
      },{
        text: "ctrl + k",
        items: [{
          text: "template \"kanban\"",
          items: []
        }]
      },{
        text: "ctrl + w",
        items: [{
          text: "template \"days of the week\"",
          items: []
        }]
      }]
    },{
      text: "templates",
      items: [{
        text: "kanban",
        items: [{
          text: "DONE",
          items: []
        },{
          text: "IN PROGRESS",
          items: []
        },{
          text: "TODO",
          items: []
        }]
      },{
        text: "days of the week",
        items: [{
          text: "Monday",
          items: []
        },{
          text: "Tuesday",
          items: []
        },{
          text: "Wednesday",
          items: []
        },{
          text: "Thursday",
          items: []
        },{
          text: "Friday",
          items: []
        },{
          text: "Saturday",
          items: []
        },{
          text: "Sunday",
          items: []
        }]
      }]
    },{
      text: "default theme",
      items: [{
        text: "light",
        items: []
      }]
    }]
  }

  def initialize(user_id)
    @user_id = user_id
  end

  def create_preference_items
    im = ItemManager.new(user.preferences.id)
    im.create_items_from_tree(DEFAULT_PREFERENCES)
  end

  private

  def user
    @user ||= User.find(@user_id)
  end

end
