class NutritionError(Exception):
    pass
    
class BiometricInputError(NutritionError):
    def __init__(self, field, rejected_value):
        self.field = field
        self.rejected_value = rejected_value
        self.message = f"You have entered an incorrect {rejected_value} value in the {field} field."
        super().__init__(self.message)   

class UserBiometrics():
    age: int
    weight : int
    height: int
    sex : str
    activity_level : str
    body_fat: float

    ACTIVITY_MULTIPLIERS = {
        'sedentary': 1.200,
        'lightly_active': 1.375,
        'moderate_active': 1.550,
        'highly_active': 1.725,
        'extreme_active': 1.900
    }

    def __init__(self, age: int, weight: int, height: int, sex: str, activity_level: str, body_fat = None): 
        self.verify_user_biometrics(age, weight, height, sex, activity_level, body_fat)
        
        self.age = age
        self.weight = weight
        self.height = height
        self.sex = sex
        self.activity_level = activity_level
        self.body_fat = body_fat
    
    def verify_user_biometrics(self, age, weight, height, sex, activity_level, body_fat):
        if age < 18 or age > 80:
            raise BiometricInputError('age', age)
        if weight < 22 or weight > 226:
            raise BiometricInputError('weight', weight)
        if height < 91 or height > 243:
            raise BiometricInputError('height', height)
        if sex != 'Male' and sex != "Female":
            raise BiometricInputError('sex', sex)
        if activity_level not in UserBiometrics.ACTIVITY_MULTIPLIERS.keys():
            raise BiometricInputError('activity level', activity_level)
        if body_fat is not None:
            if body_fat < 0.03 or body_fat > 0.50:
                raise BiometricInputError('body fat', body_fat)
            
    def calculate_bmr(self):
        #The Mifflin-St Jeor Formula
        if self.body_fat == None:
            bmr = (10 * self.weight) + (6.25 * self.height) - (5 * self.age)
            if self.sex == "Male":
                bmr += 5
            else:
                bmr -= 161
         #The Katch-McArdle Formula       
        else:
            fat_mass = self.weight * self.body_fat
            lean_body_mass = self.weight - fat_mass

            bmr = 370 + (21.6  * lean_body_mass)

        return bmr

    def calculate_tdee(self):
        bmr = self.calculate_bmr()

        tdee = bmr * self.ACTIVITY_MULTIPLIERS.get(self.activity_level)

        return tdee

    def generate_macros(self, goal):
        tdee = self.calculate_tdee()
        match goal:
            case 'maintain':
                target_calories = tdee
                protein_grams = self.weight * 2.2
                fat_grams = (target_calories * 0.25) / 9
                carb_grams = (target_calories - (protein_grams + fat_grams)) / 4
            case 'bulk':
                target_calories = tdee + 350
                protein_grams = self.weight * 2.2
                fat_grams = (target_calories * 0.25) / 9
                carb_grams = (target_calories - (protein_grams + fat_grams)) / 4              
            case 'cut':
                target_calories = tdee - 500
                protein_grams = self.weight * 2.2
                fat_grams = (target_calories * 0.25) / 9
                carb_grams = (target_calories - (protein_grams + fat_grams)) / 4
            case _:
                raise BiometricInputError('goal', goal)
            
        macros = {
            'total_calories': target_calories,
            'protein': protein_grams,
            'fat': fat_grams,
            'carbs': carb_grams
        }

        return macros