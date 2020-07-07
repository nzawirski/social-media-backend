### Backend for a social media site. Roughly based on an app i created for my B.Eng project. 

#### App has all most functionalities expected from a social media website
* Users can create accounts and update information on their profiles
* Users can follow other users, search and browse each others profiles
* Users can create posts, comment on posts, and like each others posts and comments
* Users can privately message each other and create group conversations
* App provides users with a news feed containing newest posts from people they follow
* Newly created accounts have to be activated via email
* App has 'forgot password' option allowing users to reset password by emailing them a special temporary access token

#### Notable dependencies
* API created using **express**
* **JWT** used for authorization and authentication, **bcrypt** used for hashing passwords
* Using **MongoDB** with **Mongoose ODM**
* **socket.io** used for notifications and instant messaging 
* Frameworks used for testing are **chai**, **mocha**, **mongodb-memory-server**, **supertest**
* Swagger documentation created using **swagger-ui-express**
* **multer** for file uloads
* **nodemailer** for sending emails, emails use **jade** templates
