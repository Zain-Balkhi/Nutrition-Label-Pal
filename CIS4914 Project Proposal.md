# **Nutritional Label Pal**

**Team Yikes:**

* Syed Balkhi (Team Lead, Backend Dev)  
* Jehan Peralta (Scrum Master, Frontend Dev)  
* Taran Ramu (Front/Backend Dev)

**Advisor:**  
Rong Zhang  
[rzhang1@ufl.edu](mailto:rzhang1@ufl.edu)

**Submission Date:** Feb 1st, 2026

# 

# Abstract {#abstract}

Nutritional Label Pal is a web application designed to help small food businesses and meal prep entrepreneurs generate FDA-compliant nutrition labels for their products. Many small-scale food sellers, such as farmers market vendors, cottage food producers, and meal prep services, lack the resources to obtain professional nutritional analysis for their recipes. Our application addresses this by allowing users to input recipes in plain text, which are then processed using a large language model (LLM) to extract and standardize ingredients. The system queries the USDA FoodData Central database to retrieve accurate nutritional information, performs the necessary calculations including FDA-mandated rounding rules, and generates a downloadable nutrition label. Built with a React and TypeScript frontend, a Python FastAPI backend, and a PostgreSQL database, Nutritional Label Pal offers an accessible, free solution that prioritizes ease of use and time efficiency for busy business owners.

# Table of Contents {#table-of-contents}

[Abstract	2](#abstract)

[Table of Contents	2](#table-of-contents)

[Introduction & Motivation	2](#introduction-&-motivation)

[Literature Survey	3](#literature-survey)

[Proposed Work	4](#proposed-work)

[Product Backlog	5](#product-backlog)

[Project Plan	7](#project-plan)

[References	8](#references)

[Team Contract	9](#team-contract)

[Advisor Signature	11](#advisor-signature)

# Introduction & Motivation {#introduction-&-motivation}

Nutrition labels are everywhere in grocery stores, but they’re missing from places like farmers markets, bake sales, and small meal prep businesses. While brainstorming project ideas together in the library, we realized this problem exists not because small food vendors don’t care, but because creating nutrition labels is hard. Lab testing is expensive, and manually calculating nutrition information takes time, technical knowledge, and familiarity with FDA rules. All things most small producers don’t have or want, they just want to produce.  
Even though we didn’t discover this problem through a single personal experience, it connects closely to our lives. Many of us have bought food from local vendors or meal prep services where nutrition information would have been useful, especially for people tracking macros or managing dietary restrictions. There’s clearly demand for nutritional transparency, but no simple way for small-scale food producers to provide it.  
Our solution is designed for farmers market vendors, cottage food producers, meal prep services, food trucks, and even individuals who want nutrition information for their own recipes. These people are busy and don’t have time to manually look up ingredients and calculate values themselves. The app allows users to enter a recipe in plain text, then automatically processes the ingredients, calculates nutritional values, and generates a properly formatted nutrition label. By automating this process, we make nutrition labeling faster, cheaper, and far more accessible.  
The impact of this project is pretty straightforward, it helps small food businesses appear more professional, gives consumers better information, and lowers the barrier to nutritional transparency. 

# Literature Survey {#literature-survey}

To understand the current state of nutrition labeling for small food businesses, we reviewed FDA regulations, industry guidance for emerging brands, and existing software tools. The FDA’s Small Business Nutrition Labeling Exemption Guide explains that businesses with under $50,000 in annual food sales, or $500,000 in total sales, are not required to provide nutrition labels. This exemption exists to protect small producers from the high cost of professional nutritional analysis. However, many small businesses want to include them voluntarily to appear more professional and provide more value to their customers. If a business chooses to provide nutrition information, it must be accurate, which makes the use of reliable USDA data and FDA rounding rules important.
Industry resources reinforce this need. An article from RangeMe discusses how nutrition labeling is often a major obstacle for emerging food brands, especially when trying to sell through retailers that expect nutrition facts even from exempt businesses. The article outlines options such as lab testing and software-based tools, while emphasizing ongoing concerns around accuracy and compliance. This confirmed for us that small food producers are actively looking for affordable and accessible ways to generate nutrition labels.  
We also examined existing platforms like ReciPal and RecipeCard.io, which allow users to create nutrition labels from recipes without lab testing. While these tools are useful, they rely heavily on manual input, requiring users to search for ingredients and enter exact quantities. This process can be time-consuming for small business owners. Our application builds on these ideas by accepting recipes in plain text and automating ingredient normalization, reducing the effort required and prioritizing the user’s time.

# Proposed Work {#proposed-work}

We will build Nutritional Label Pal as a full-stack web application with a clear separation between frontend and backend components.

**Frontend:** The user interface will be built using React with TypeScript, providing a modern experience that works on both desktop and mobile browsers. The frontend will handle recipe input, display the parsed ingredient verification screen, render the nutrition label preview, and manage user accounts and saved recipes.

**Backend:** The server will be built using Python with the FastAPI framework. FastAPI provides excellent performance, automatic API documentation, and native support for asynchronous operations. The backend will handle user authentication, recipe storage, LLM integration for recipe parsing, USDA API queries, nutritional calculations, and label generation.

**Database:** We will use PostgreSQL to store user accounts, saved recipes, parsed ingredients, and cached nutritional data. 

**External Services:** We will integrate with the OpenAI API (using a model like GPT-4o-mini) to parse and normalize recipe text. For nutritional data, we will use the USDA FoodData Central API, which provides comprehensive nutritional information for thousands of food items at no cost.

**Hosting:** The application will be deployed using cloud hosting providers such as Vercel or Cloudflare for the frontend, with the backend and database hosted on a platform like Railway or on a local server.

**Key Features**

The application will support the following core functionality:

* **Recipe Input:** Users can type recipes in natural language format  
* **Smart Parsing:** The system normalizes ingredients, standardizes measurements, and handles ambiguous quantities  
* **User Verification:** Before generating a label, users can review and correct the parsed interpretation  
* **Nutritional Calculation:** The system queries USDA data and calculates per-serving nutritional values  
* **FDA Compliance:** All values are rounded according to FDA guidelines, and labels include all required nutrients  
* **Label Generation:** Users receive a properly formatted nutrition label that can be downloaded as an image or PDF  
* **Account System:** Users can create accounts to save and manage multiple recipes  
* **Recipe Management:** Full create, read, update, and delete functionality for saved recipes

**Target Audience**

Our primary audience is small food business owners and meal prep entrepreneurs who need nutrition labels but lack the time or resources for professional analysis. Secondary users include home cooks and fitness enthusiasts who want to track the nutritional content of their own recipes.

# Product Backlog {#product-backlog}

**Needs:** 

| Feature | Description | Owner |
| ----- | ----- | ----- |
| User Authentication | Account creation, login, logout, and session management | Taran |
| Recipe Text Input | Text area for users to enter recipes in natural language | Jehan |
| LLM Recipe Parsing | Integration with OpenAI API to normalize recipe text into structured data | Syed |
| Ingredient Verification UI | Interface for users to review and correct parsed ingredients | Jehan |
| USDA API Integration | Query USDA FoodData Central to retrieve nutritional data for ingredients | Syed |
| Nutritional Calculations | Calculate total and per-serving values with FDA rounding rules | Taran |
| Nutrition Label Display | Render FDA-compliant nutrition label in the browser | Jehan |
| Label Download | Export nutrition label as PNG image | Jehan |
| Save Recipe | Store recipes to user account in database | Taran |
| Recipe Dashboard | View list of all saved recipes | Jehan |
| Edit Recipe | Modify existing saved recipes | Taran |
| Delete Recipe | Remove recipes from account | Taran |
| Database Schema | Design and implement PostgreSQL tables for users, recipes, ingredients | Syed |
| PDF Export | Download nutrition label as PDF document | Jehan |
| Serving Size Adjustment | Allow users to specify custom serving sizes | Taran |
| Recipe Scaling | Multiply recipe quantities (double batch, half batch, etc.) | Taran |
| Label Size Options | Offer different label formats (standard, small, linear) | Jehan |
| Ingredient List on Label | Include formatted ingredient list with label | Syed |
| Error Handling | Graceful handling of missing ingredients, API failures | All |
| Responsive Design | Mobile-friendly interface | Jehan |

**Wants:**

| Feature | Description | Owner |
| ----- | ----- | ----- |
| Voice Input | Speech-to-text recipe entry using Web Speech API | Jehan |
| Photo/OCR Input | Upload photo of written recipe for automatic parsing | Syed |
| Mobile App | Native iOS/Android app connecting to our backend | All |
| Allergen Flagging | Automatically identify and highlight common allergens | Taran |

# Project Plan {#project-plan}

**Timeline Overview**

| Week | Dates \~ | Milestone | Key Deliverables |
| ----- | ----- | ----- | ----- |
| 1-2 | 1/20 \- 1/31 | Project Setup | Proposal complete, repository created, development environment configured |
| 3-4 | 2/3 \- 2/14 | Foundation | User authentication working, basic UI shell, database schema implemented |
| — | 2/15 | Presentation 1 | Project update and progress demonstration |
| 5-6 | 2/17 \- 2/28 | Core Processing | LLM parsing integration, USDA API integration, ingredient verification flow |
| 7-8 | 3/3 \- 3/14 | Label Generation | Nutritional calculations, FDA rounding, label rendering and download |
| — | 3/13 | Presentation 2 | Working demo of core functionality, testing plans |
| 9-10 | 3/17 \- 3/28 | Recipe Management | Save/edit/delete recipes, recipe dashboard, user accounts fully functional |
| 11-12 | 3/31 \- 4/11 | Polish & Stretch | Bug fixes, UI polish, stretch features if time permits |
| — | 4/14 | Senior Showcase | Complete, polished application ready for demonstration |
| 13 | 4/14 \- 4/21 | Final Documentation | Final report, presentation preparation |
| — | 4/21 | Final Presentation | Project demonstration and presentation |

**Repository**  
[GitHub](https://github.com/Zain-Balkhi/Nutrition-Label-Pal)

# References {#references}

U.S. Food and Drug Administration. (n.d.). Small Business Nutrition Labeling Exemption Guide. FDA. [https://www.fda.gov/food/labeling-nutrition-guidance-documents-regulatory-information/small-business-nutrition-labeling-exemption-guide](https://www.fda.gov/food/labeling-nutrition-guidance-documents-regulatory-information/small-business-nutrition-labeling-exemption-guide)

RangeMe. (n.d.). Do-It-Yourself Nutrition Labeling for Emerging Food Brands. RangeMe Blog. [https://www.rangeme.com/blog/do-it-yourself-nutrition-labeling-for-emerging-food-brands/](https://www.rangeme.com/blog/do-it-yourself-nutrition-labeling-for-emerging-food-brands/)

RecipeCard.io. (n.d.). Nutrition Facts Label Generator. [https://recipecard.io/nutrition-facts-label-generator/](https://recipecard.io/nutrition-facts-label-generator/)

U.S. Department of Agriculture. (n.d.). FoodData Central. USDA. [https://fdc.nal.usda.gov/](https://fdc.nal.usda.gov/)

# 

# Team Contract {#team-contract}

**Project Overview**  
This team contract outlines the objectives, roles, expectations, and working agreements for our Senior Design group project. The purpose of this contract is to ensure clear communication, accountability, and a productive team environment throughout the semester.

**Overall Objectives**  
The objective of this team is to design, build, and deliver a functional screen recording tool as our Senior Design project. The tool will allow users to record their screen, capture audio, and export recordings to a web server in a user-friendly and reliable manner to share. In addition to delivering a working product, the team aims to practice industry-standard software development processes, collaborate effectively, meet all course milestones, and produce thorough documentation and presentations required by the course.

**Individual Roles and Responsibilities**  
Team Lead: Syed Balkhi  
The Team Lead is responsible for overall project coordination, keeping the team aligned with milestones and deadlines, communicating with the advisor when needed, and ensuring tasks are clearly defined and assigned.

Scrum Master: Jehan Peralta  
The Scrum Master facilitates sprint planning, stand-ups, and retrospectives, tracks progress using the chosen project management tool, removes blockers when possible, and ensures the team follows an agile workflow.

Front End Developer: Jehan Peralta  
The Front End Developer is responsible for the user interface and user experience of the screen recording tool, including layout, controls, responsiveness, and integration with the back-end APIs.

Back End Developer: Taran Ramu  
The Back End Developer is responsible for the core recording logic, data handling, performance optimization, file storage/export functionality, and integration with the front end.

Infra Developer: Syed Balkhi  
The Infra Developer is responsible for the core sharing logic, data handling, transfer optimization, file storage/export functionality, and integration with the app.

All team members are expected to contribute to design discussions, code reviews, testing, documentation, and presentations regardless of their primary role.

**Values and Agreement Statements**

1. All team members will communicate openly, respectfully, and professionally.  
2. All team members will complete assigned tasks on time or communicate early if issues arise.  
3. All team members will attend scheduled meetings prepared and on time.  
4. Decisions will be made collaboratively, with technical disagreements resolved through discussion and evidence.  
   

**Software Configuration Management Protocol**  
The team will use Git for version control with a shared repository hosted on GitHub. A main branch will represent stable code, and feature branches will be used for development. All changes must be submitted via pull requests and reviewed by at least one other team member before merging. Commit messages must be clear and descriptive. Merge conflicts will be resolved collaboratively, and the team will maintain consistent coding standards and documentation to ensure code quality.

**Meeting Day/Times (Team Only)**  
The team will meet outside of advisor meetings at least once per week. Tentative meeting time:  
Day: Monday and Wednesdays  
Time: 10:30am  
Additional meetings may be scheduled as needed before major deadlines.

**Meeting Dates/Times With Advisor**  
The team will meet with the advisor on a regular basis, weekly or bi-weekly, as agreed upon with the advisor. Calendar invites will be created for all advisor meetings. Each team member will serve as facilitator for at least one advisor meeting, and all members are required to attend every advisor meeting unless circumstances prevent them to.

**Communication**  
The team will primarily communicate through a group chat platform (iMessage) for quick updates and questions. GitHub will be used for code-related communication and issue tracking. Email will be used for formal communication with the advisor when necessary.

**Conflict Resolution Protocol**  
The involved parties will discuss the issue privately and respectfully.  
If unresolved, the issue will be brought to the full team for discussion.  
If the conflict persists, the advisor will be consulted for guidance.

**Consequences**  
If a team member repeatedly violates this agreement, the issue will be documented and discussed with the team. Continued violations may result in involvement of the course instructor or advisor and may impact peer evaluations or individual grades.

**Signatures**  
By signing below, each team member agrees to the terms outlined in this Team Contract.

Name: Syed Balkhi  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Date: 1/20/26

Name: Jehan Peralta  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Date: 1/20/26

Name: Taran Ramu  
Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Date: 1/20/26

# Advisor Signature {#advisor-signature}

Name:   
Signature:   
Date: 