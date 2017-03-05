class HomeController < ApplicationController

  def index
    if current_user
      redirect_to profile_page_path(username: current_user.username)
    else
      redirect_to 'http://calculist.io'
    end
  end

end
