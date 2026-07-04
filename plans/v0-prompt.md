Build me a fully browser-based single-page application that resizes, crops, and formats portrait photographs into compliant passport photos.

The application ensures that:

* The subject’s head height (chin to crown) matches official requirements.
* The final image matches user-defined physical dimensions (mm).
* The output is suitable for official submission (passport, visa, ID).
* All processing happens locally in the browser.
* No images are uploaded to any server.

Here's what it should do:

1. **Image Upload & Capture**: Users can upload images from device storage or capture images using the device camera (mobile). Supported formats include JPG, PNG, with a maximum file size of 20 MB. The uploaded image is displayed immediately.
2. **Passport Specification Input**: Users can define the required passport photo specifications, including head height and physical dimensions in millimeters. Form controls should be able to increment these dimensions in millimetre increments. The application will validate these inputs against official requirements.
3. **Face Detection & Geometry Calculation**: The application will use MediaPipe Face Landmarker to detect facial landmarks and calculate the chin-to-crown height. The detected landmarks should be visualised on the image. It will then compute the necessary crop and scale to ensure the head height matches the user-defined specifications.
4. **Interactive Cropping & Adjustment**: Users can interactively adjust the crop area and scale of the image. The application will provide visual feedback, including a grid overlay and measurement lines, to help users align the head correctly within the specified dimensions.
5. **Preview & Export**: Users can preview the final passport photo and export it in the desired format (JPG, PNG) and resolution. The application will also support generating multi-photo sheets for printing. The exported image will maintain the original quality and meet the specified dimensions.
6. **User Interface & Experience**: The application will have a clean, intuitive interface with a two-pane layout: the left pane for specifications and controls, and the right pane for the image preview. It will use a consistent color palette and typography to convey precision and professionalism. The application will provide real-time feedback on adjustments and ensure that all interactions are smooth and responsive.
7. **Privacy & Security**: The application will ensure that all processing is done locally in the browser, with no images uploaded to any server. Users' privacy will be respected, and no personal data will be collected or stored.
8. **Performance & Compatibility**: The application will be optimized for performance, ensuring fast interactive editing with preview updates under 250ms on mobile devices. It will be compatible with modern browsers and responsive to different screen sizes.
9. **Testing & Quality Assurance**: The application will include unit and integration tests to ensure functionality and reliability. It will be built with TypeScript for type safety and maintainability, and the codebase will follow best practices for organization and readability.
10. **Deployment & Hosting**: The application will be deployed as a static web app, suitable for hosting on platforms like GitHub Pages, Cloudflare Pages, or Netlify. It will be accessible via a public URL and will not require any server-side components.

