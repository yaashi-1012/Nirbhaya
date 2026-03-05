export const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "naarishakti");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/duz1thea4/image/upload",
        {
            method: "POST",
            body: formData,
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return data.secure_url;
};

export const uploadToCloudinaryAdvanced = async (file, folder = "sisterhood/general") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "naarishakti");
    formData.append("folder", folder);

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/duz1thea4/image/upload",
        {
            method: "POST",
            body: formData,
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return {
        url: data.secure_url,
        publicId: data.public_id
    };
};
